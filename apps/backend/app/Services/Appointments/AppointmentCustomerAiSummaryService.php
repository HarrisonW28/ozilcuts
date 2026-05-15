<?php

namespace App\Services\Appointments;

use App\Models\Appointment;
use App\Models\CustomerNote;
use App\Models\User;
use App\Services\Customers\HairProfileService;
use App\Services\Reports\CustomerAnalyticsService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Staff-only narrative summaries from booking context. Optional OpenAI when
 * configured; otherwise deterministic copy. No customer email is sent to
 * external models — only first-name + structured visit/hair/note snippets.
 */
final class AppointmentCustomerAiSummaryService
{
    private const NOTE_LIMIT = 12;

    private const BODY_SNIPPET = 320;

    public function __construct(
        private readonly CustomerAnalyticsService $analytics,
        private readonly HairProfileService $hairProfiles,
        private readonly QueueWaitIntelligenceService $queueIntel,
    ) {}

    /**
     * @return array{
     *     linked_customer: bool,
     *     source: 'model'|'rules',
     *     privacy: array{staff_only: string, third_party: string|null},
     *     sections: array{
     *         hair_preferences: string|null,
     *         visit_summary: string|null,
     *         notes_digest: string|null,
     *         operational_signals: string|null,
     *     },
     *     generated_at: string|null,
     * }
     */
    public function summarize(Appointment $appointment): array
    {
        $appointment->loadMissing(['service', 'customer.customerProfile']);

        $queuePayload = $this->queueIntel->summarize($appointment, null, true);
        $operational = $this->trim((string) ($queuePayload['headline'] ?? ''), 480);

        $privacy = [
            'staff_only' => 'This summary is only available to the assigned barber and shop admins. Do not share outside the business.',
            'third_party' => $this->thirdPartyPrivacyLine(),
        ];

        if ($appointment->customer_user_id === null) {
            return [
                'linked_customer' => false,
                'source' => 'rules',
                'privacy' => $privacy,
                'sections' => [
                    'hair_preferences' => null,
                    'visit_summary' => null,
                    'notes_digest' => null,
                    'operational_signals' => $operational !== '' ? $operational : null,
                ],
                'generated_at' => now()->toIso8601String(),
            ];
        }

        $customer = $appointment->customer;
        if ($customer === null) {
            return [
                'linked_customer' => false,
                'source' => 'rules',
                'privacy' => $privacy,
                'sections' => [
                    'hair_preferences' => null,
                    'visit_summary' => null,
                    'notes_digest' => null,
                    'operational_signals' => $operational !== '' ? $operational : null,
                ],
                'generated_at' => now()->toIso8601String(),
            ];
        }

        $customer->loadMissing('customerProfile');
        $context = $this->buildContext($appointment, $customer, $operational);

        $rulesSections = $this->rulesSections($context);

        $apiKey = config('services.openai.api_key');
        if (! is_string($apiKey) || trim($apiKey) === '') {
            return $this->payload(true, 'rules', $privacy, $rulesSections);
        }

        $modelSections = $this->tryOpenAiSections($context, $apiKey);
        if ($modelSections !== null) {
            return $this->payload(true, 'model', $privacy, $modelSections);
        }

        return $this->payload(true, 'rules', $privacy, $rulesSections);
    }

    /**
     * @param  array{
     *     guest_first: string,
     *     recognition_tier: string,
     *     total_visits: int,
     *     visits_with_this_barber: int,
     *     favorite_services: list<string>,
     *     last_visit_at: string|null,
     *     booking_preferences_note: string|null,
     *     hair: array<string, string|null>,
     *     notes: list<array{body: string, pinned: bool}>,
     *     operational_headline: string|null,
     *     current_service: string|null,
     * }  $context
     * @param  array{
     *     hair_preferences: string|null,
     *     visit_summary: string|null,
     *     notes_digest: string|null,
     *     operational_signals: string|null,
     * }  $sections
     * @param  array{staff_only: string, third_party: string|null}  $privacy
     * @return array{
     *     linked_customer: bool,
     *     source: 'model'|'rules',
     *     privacy: array{staff_only: string, third_party: string|null},
     *     sections: array{
     *         hair_preferences: string|null,
     *         visit_summary: string|null,
     *         notes_digest: string|null,
     *         operational_signals: string|null,
     *     },
     *     generated_at: string|null,
     * }
     */
    private function payload(bool $linked, string $source, array $privacy, array $sections): array
    {
        return [
            'linked_customer' => $linked,
            'source' => $source,
            'privacy' => $privacy,
            'sections' => $sections,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    private function thirdPartyPrivacyLine(): ?string
    {
        $openaiKey = config('services.openai.api_key');

        return is_string($openaiKey) && trim($openaiKey) !== ''
            ? 'When AI is enabled, anonymized visit context (no email addresses) may be processed by the configured model provider solely to draft this summary.'
            : null;
    }

    /**
     * @return array{
     *     guest_first: string,
     *     recognition_tier: string,
     *     total_visits: int,
     *     visits_with_this_barber: int,
     *     favorite_services: list<string>,
     *     last_visit_at: string|null,
     *     booking_preferences_note: string|null,
     *     hair: array<string, string|null>,
     *     notes: list<array{body: string, pinned: bool}>,
     *     operational_headline: string|null,
     *     current_service: string|null,
     * }
     */
    private function buildContext(Appointment $appointment, User $customer, string $operational): array
    {
        $summary = $this->analytics->forCustomer($customer);
        $tier = $this->analytics->recognitionTierFor($summary);
        $favorites = $this->analytics->favoriteServicesForCustomer($customer, 5);
        $favNames = [];
        foreach ($favorites as $row) {
            $favNames[] = (string) ($row['service_name'] ?? '');
        }
        $favNames = array_values(array_filter($favNames, fn (string $s) => $s !== ''));

        $prefsRaw = $customer->customerProfile?->preferences;
        $bookingNote = is_string($prefsRaw) && trim($prefsRaw) !== ''
            ? $this->trim(trim($prefsRaw), 500)
            : null;

        $profile = $this->hairProfiles->findForUser($customer);
        $hair = [
            'hair_type' => $profile?->hair_type,
            'hair_thickness' => $profile?->hair_thickness,
            'hair_length' => $profile?->hair_length,
            'scalp_condition' => $profile?->scalp_condition,
            'preferred_clipper_guard' => $profile?->preferred_clipper_guard,
            'allergies' => $profile?->allergies ? $this->trim((string) $profile->allergies, 220) : null,
            'styling_notes' => $profile?->styling_notes ? $this->trim((string) $profile->styling_notes, 400) : null,
        ];

        $noteRows = CustomerNote::query()
            ->where('customer_user_id', $customer->id)
            ->orderByDesc('pinned')
            ->orderByDesc('updated_at')
            ->limit(self::NOTE_LIMIT)
            ->get(['body', 'pinned']);

        $notes = [];
        foreach ($noteRows as $n) {
            $body = is_string($n->body)
                ? $this->trim((string) preg_replace('/\s+/', ' ', $n->body), self::BODY_SNIPPET)
                : '';
            if ($body !== '') {
                $notes[] = ['body' => $body, 'pinned' => (bool) $n->pinned];
            }
        }

        $fullName = trim((string) $customer->name);
        $guestFirst = $fullName === '' ? 'Guest' : (explode(' ', $fullName, 2)[0] ?: 'Guest');

        return [
            'guest_first' => $guestFirst,
            'recognition_tier' => $tier,
            'total_visits' => (int) ($summary['total_visits'] ?? 0),
            'visits_with_this_barber' => $this->analytics->visitsWithBarberCount(
                (int) $customer->id,
                (int) $appointment->barber_user_id,
            ),
            'favorite_services' => $favNames,
            'last_visit_at' => isset($summary['last_visit_at']) && is_string($summary['last_visit_at'])
                ? $summary['last_visit_at']
                : null,
            'booking_preferences_note' => $bookingNote,
            'hair' => $hair,
            'notes' => $notes,
            'operational_headline' => $operational !== '' ? $operational : null,
            'current_service' => $appointment->service?->name,
        ];
    }

    /**
     * @param  array{
     *     guest_first: string,
     *     recognition_tier: string,
     *     total_visits: int,
     *     visits_with_this_barber: int,
     *     favorite_services: list<string>,
     *     last_visit_at: string|null,
     *     booking_preferences_note: string|null,
     *     hair: array<string, string|null>,
     *     notes: list<array{body: string, pinned: bool}>,
     *     operational_headline: string|null,
     *     current_service: string|null,
     * }  $c
     * @return array{
     *     hair_preferences: string|null,
     *     visit_summary: string|null,
     *     notes_digest: string|null,
     *     operational_signals: string|null,
     * }
     */
    private function rulesSections(array $c): array
    {
        $hairBits = [];
        foreach ($c['hair'] as $k => $v) {
            if ($v !== null && $v !== '' && is_string($v)) {
                $hairBits[] = str_replace('_', ' ', $k).': '.$v;
            }
        }
        $hairOut = count($hairBits) > 0 ? $this->trim(implode(' ', $hairBits), 520) : null;

        $favLine = count($c['favorite_services']) > 0
            ? implode(', ', array_slice($c['favorite_services'], 0, 4))
            : 'no favourite pattern yet';

        $last = $c['last_visit_at'] !== null
            ? ' Last confirmed visit '.$c['last_visit_at'].'.'
            : '';

        $visit = $this->trim(
            sprintf(
                '%s has %d confirmed salon visits, %d with you. Recognition band: %s. Often books: %s.%s',
                $c['guest_first'],
                $c['total_visits'],
                $c['visits_with_this_barber'],
                $c['recognition_tier'],
                $favLine,
                $last,
            ),
            560,
        );

        $notesOut = null;
        if (count($c['notes']) > 0) {
            $chunks = [];
            foreach (array_slice($c['notes'], 0, 4) as $n) {
                $prefix = $n['pinned'] ? 'Pinned: ' : '';
                $chunks[] = $prefix.$n['body'];
            }
            $notesOut = $this->trim(implode(' · ', $chunks), 520);
        }

        $prefs = $c['booking_preferences_note'] !== null
            ? ' Profile note: '.$c['booking_preferences_note']
            : '';

        $visitWithPrefs = $prefs !== '' ? $this->trim($visit.$prefs, 620) : $visit;

        return [
            'hair_preferences' => $hairOut,
            'visit_summary' => $visitWithPrefs,
            'notes_digest' => $notesOut,
            'operational_signals' => $c['operational_headline'],
        ];
    }

    /**
     * @param  array{
     *     guest_first: string,
     *     recognition_tier: string,
     *     total_visits: int,
     *     visits_with_this_barber: int,
     *     favorite_services: list<string>,
     *     last_visit_at: string|null,
     *     booking_preferences_note: string|null,
     *     hair: array<string, string|null>,
     *     notes: list<array{body: string, pinned: bool}>,
     *     operational_headline: string|null,
     *     current_service: string|null,
     * }  $context
     * @return array{
     *     hair_preferences: string|null,
     *     visit_summary: string|null,
     *     notes_digest: string|null,
     *     operational_signals: string|null,
     * }|null
     */
    private function tryOpenAiSections(array $context, string $apiKey): ?array
    {
        $model = (string) config('services.openai.model', 'gpt-4o-mini');
        $base = rtrim((string) config('services.openai.base_url', 'https://api.openai.com/v1'), '/');

        $payloadContext = [
            'guest_first_name' => $context['guest_first'],
            'recognition_tier' => $context['recognition_tier'],
            'total_visits' => $context['total_visits'],
            'visits_with_assigned_barber' => $context['visits_with_this_barber'],
            'favorite_services' => $context['favorite_services'],
            'last_visit_at' => $context['last_visit_at'],
            'booking_preferences_note' => $context['booking_preferences_note'],
            'hair_fields' => $context['hair'],
            'staff_notes' => array_map(
                fn (array $n) => ['pinned' => $n['pinned'], 'text' => $n['body']],
                $context['notes'],
            ),
            'today_operational_headline' => $context['operational_headline'],
            'current_booking_service' => $context['current_service'],
        ];

        $userJson = json_encode($payloadContext, JSON_THROW_ON_ERROR);

        try {
            $response = Http::timeout(28)
                ->withToken($apiKey)
                ->acceptJson()
                ->post($base.'/chat/completions', [
                    'model' => $model,
                    'temperature' => 0.35,
                    'response_format' => ['type' => 'json_object'],
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => <<<'PROMPT'
You write concise salon staff briefings. Reply with a single JSON object and these keys only: "hair_preferences", "visit_summary", "notes_digest", "operational_signals". Each value is either a short plain-text string (max 450 characters) or null if there is nothing meaningful.

Rules:
- Use ONLY facts present in the user JSON. Do not invent allergies, conditions, or services.
- No medical or legal advice. Neutral, professional tone.
- Do not include email addresses or phone numbers (there should be none).
- "hair_preferences" = haircut / hair profile preferences only.
- "visit_summary" = visit frequency, loyalty band, favourite services, last visit — grounded in counts and dates provided.
- "notes_digest" = synthesize staff/barber notes only; if staff notes are empty, set "notes_digest" to null.
- "operational_signals" = paraphrase today's operational headline in one or two short sentences, or null if missing.
PROMPT,
                        ],
                        [
                            'role' => 'user',
                            'content' => 'Context JSON (staff-only): '.$userJson,
                        ],
                    ],
                ]);
        } catch (\Throwable $e) {
            Log::warning('OpenAI appointment summary transport failed', [
                'message' => $e->getMessage(),
            ]);

            return null;
        }

        if (! $response->successful()) {
            Log::warning('OpenAI appointment summary HTTP error', [
                'status' => $response->status(),
            ]);

            return null;
        }

        $content = data_get($response->json(), 'choices.0.message.content');
        if (! is_string($content) || trim($content) === '') {
            return null;
        }

        try {
            /** @var array<string, mixed> $decoded */
            $decoded = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }

        return $this->normalizeSectionArray($decoded);
    }

    /**
     * @param  array<string, mixed>  $decoded
     * @return array{
     *     hair_preferences: string|null,
     *     visit_summary: string|null,
     *     notes_digest: string|null,
     *     operational_signals: string|null,
     * }|null
     */
    private function normalizeSectionArray(array $decoded): ?array
    {
        $keys = ['hair_preferences', 'visit_summary', 'notes_digest', 'operational_signals'];
        $out = [];
        foreach ($keys as $k) {
            $v = $decoded[$k] ?? null;
            if ($v === null) {
                $out[$k] = null;

                continue;
            }
            if (! is_string($v)) {
                return null;
            }
            $t = trim($v);
            $out[$k] = $t === '' ? null : $this->trim($t, 520);
        }

        if ($out['hair_preferences'] === null && $out['visit_summary'] === null
            && $out['notes_digest'] === null && $out['operational_signals'] === null) {
            return null;
        }

        return $out;
    }

    private function trim(string $value, int $max): string
    {
        return Str::limit($value, $max, '…');
    }
}
