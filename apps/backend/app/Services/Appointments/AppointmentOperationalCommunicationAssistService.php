<?php

namespace App\Services\Appointments;

use App\Models\Appointment;
use App\Models\AppointmentMessage;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Optional AI-assisted phrasing for the booking thread: calm delay nudges and
 * human-sounding note ideas. Rules-first; OpenAI only when configured.
 * Never posts automatically — suggestions only.
 */
final class AppointmentOperationalCommunicationAssistService
{
    public function __construct(
        private readonly AppointmentMessageService $messages,
        private readonly QueueWaitIntelligenceService $queueIntel,
    ) {}

    /**
     * @return array{
     *     source: 'model'|'rules',
     *     generated_at: string,
     *     privacy: array{staff_only: string, third_party: string|null},
     *     delay_prompt: string|null,
     *     suggested_notes: list<string>,
     *     optional_status_line: string|null,
     * }
     */
    public function build(Appointment $appointment, User $viewer): array
    {
        $appointment->loadMissing(['service', 'barber', 'customer']);

        $privacy = [
            'staff_only' => 'Suggestions are generated for this booking only. They are optional — review before sending.',
            'third_party' => $this->thirdPartyPrivacyLine(),
        ];

        if (! $viewer->can('sendMessages', $appointment)) {
            return $this->wrap('rules', $privacy, $this->sanitiseAssist([
                'delay_prompt' => null,
                'suggested_notes' => [],
                'optional_status_line' => null,
            ]));
        }

        if (! $this->messages->inArrivalMessagingWindow($appointment)) {
            return $this->wrap('rules', $privacy, $this->sanitiseAssist([
                'delay_prompt' => null,
                'suggested_notes' => [],
                'optional_status_line' => null,
            ]));
        }

        $shopSide = $viewer->isAdmin()
            || ($appointment->barber_user_id !== null && (int) $appointment->barber_user_id === (int) $viewer->id);

        $queue = $this->queueIntel->summarize($appointment, null, $shopSide);
        $recent = $this->recentThreadBodies($appointment);

        $ctx = [
            'viewer_role' => $shopSide ? 'shop' : 'guest',
            'arrival_state' => (string) $appointment->arrival_state,
            'service_label' => $appointment->service?->name ?? 'Appointment',
            'queue_headline' => (string) ($queue['headline'] ?? ''),
            'estimated_chair_minutes_ahead' => $queue['estimated_chair_minutes_ahead'],
            'guests_ahead_in_arrival' => (int) ($queue['guests_ahead_in_arrival'] ?? 0),
            'visits_behind_schedule' => (int) ($queue['visits_behind_schedule'] ?? 0),
            'pace_tone' => (string) ($queue['pace_tone'] ?? 'calm'),
            'recent_thread_lines' => $recent,
        ];

        $rules = $this->rulesAssist($ctx);

        $apiKey = config('services.openai.api_key');
        if (! is_string($apiKey) || trim($apiKey) === '') {
            return $this->wrap('rules', $privacy, $this->sanitiseAssist($rules));
        }

        $model = $this->tryOpenAiAssist($ctx, $apiKey);
        if ($model !== null) {
            $merged = [
                'delay_prompt' => $model['delay_prompt'] ?? $rules['delay_prompt'],
                'suggested_notes' => $this->mergeNoteLists(
                    $model['suggested_notes'] ?? [],
                    $rules['suggested_notes'],
                ),
                'optional_status_line' => $model['optional_status_line'] ?? $rules['optional_status_line'],
            ];

            return $this->wrap('model', $privacy, $this->sanitiseAssist($merged));
        }

        return $this->wrap('rules', $privacy, $this->sanitiseAssist($rules));
    }

    /**
     * @return list<string>
     */
    private function recentThreadBodies(Appointment $appointment): array
    {
        $rows = AppointmentMessage::query()
            ->where('appointment_id', $appointment->id)
            ->orderByDesc('id')
            ->limit(4)
            ->pluck('body');

        $out = [];
        foreach ($rows as $body) {
            $t = trim(preg_replace('/\s+/u', ' ', (string) $body) ?? '');
            if ($t === '') {
                continue;
            }
            $out[] = mb_substr($t, 0, 140);
        }

        return $out;
    }

    /**
     * @param  array{
     *     viewer_role: string,
     *     arrival_state: string,
     *     service_label: string,
     *     queue_headline: string,
     *     estimated_chair_minutes_ahead: int|null,
     *     guests_ahead_in_arrival: int,
     *     visits_behind_schedule: int,
     *     pace_tone: string,
     *     recent_thread_lines: list<string>,
     * }  $c
     * @return array{delay_prompt: string|null, suggested_notes: list<string>, optional_status_line: string|null}
     */
    private function rulesAssist(array $c): array
    {
        $shop = $c['viewer_role'] === 'shop';
        $behind = $c['visits_behind_schedule'] > 0;
        $est = $c['estimated_chair_minutes_ahead'];
        $ahead = $c['guests_ahead_in_arrival'];
        $state = $c['arrival_state'];

        $delayPrompt = null;
        if ($behind && $shop) {
            $delayPrompt = 'The day is running a few minutes behind — if it helps, a short honest line in the thread goes a long way.';
        } elseif ($behind && ! $shop) {
            $delayPrompt = 'Things may be running slightly behind — you can relax nearby; the page stays updated.';
        } elseif ($shop && $est !== null && $est >= 25) {
            $delayPrompt = 'There is still a little wait before the chair — a calm thread note can bridge the gap without sounding like an alert.';
        } elseif (! $shop && $est !== null && $est >= 20 && in_array($state, [Appointment::ARRIVAL_WAITING, Appointment::ARRIVAL_ARRIVED], true)) {
            $delayPrompt = 'You have a bit of buffer before the chair — no need to hurry over.';
        }

        $notes = [];
        if ($shop) {
            if ($behind) {
                $notes[] = 'Running a few minutes behind today — thanks for bearing with us.';
            }
            if ($ahead >= 1 || ($est !== null && $est >= 15)) {
                $notes[] = 'Thanks for waiting — I will bring you over as soon as the chair opens up.';
            }
            if ($state === Appointment::ARRIVAL_ARRIVED || $state === Appointment::ARRIVAL_WAITING) {
                $notes[] = 'You are on the list — I will wave you over when it is time.';
            }
            $notes[] = 'Here if you need anything before you head in.';
        } else {
            $notes[] = 'On my way — should be there within a few minutes.';
            $notes[] = 'Parked nearby; heading in at an easy pace.';
            if ($state === Appointment::ARRIVAL_WAITING) {
                $notes[] = 'No rush on my side — thanks for keeping this page updated.';
            }
        }

        $notes = array_values(array_unique(array_filter($notes)));
        $notes = array_slice($notes, 0, 3);

        $status = $notes[0] ?? null;

        return [
            'delay_prompt' => $delayPrompt,
            'suggested_notes' => $notes,
            'optional_status_line' => $status,
        ];
    }

    /**
     * @param  array{
     *     viewer_role: string,
     *     arrival_state: string,
     *     service_label: string,
     *     queue_headline: string,
     *     estimated_chair_minutes_ahead: int|null,
     *     guests_ahead_in_arrival: int,
     *     visits_behind_schedule: int,
     *     pace_tone: string,
     *     recent_thread_lines: list<string>,
     * }  $ctx
     * @return array{delay_prompt: string|null, suggested_notes: list<string>, optional_status_line: string|null}|null
     */
    private function tryOpenAiAssist(array $ctx, string $apiKey): ?array
    {
        $model = (string) config('services.openai.model', 'gpt-4o-mini');
        $base = rtrim((string) config('services.openai.base_url', 'https://api.openai.com/v1'), '/');

        $userJson = json_encode($ctx, JSON_THROW_ON_ERROR);

        try {
            $response = Http::timeout(22)
                ->withToken($apiKey)
                ->acceptJson()
                ->post($base.'/chat/completions', [
                    'model' => $model,
                    'temperature' => 0.4,
                    'response_format' => ['type' => 'json_object'],
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => <<<'PROMPT'
You help barbershop staff and guests write short, human messages for an internal "visit thread" (booking-only updates).

Return ONE JSON object with keys ONLY:
- "delay_prompt": string or null. At most one calm sentence (max 140 characters) OR null if no gentle timing nudge is needed. Never alarmist. No "AI", no "assistant", no exclamation spam (max one "!" in the whole object).
- "suggested_notes": array of 2 to 3 strings. Each string is a full short message the user could paste (max 120 characters each). Sound like a calm text — not marketing, not robotic, no hashtags or emojis.
- "optional_status_line": string or null. Either null or ONE line (max 120 chars) summarising a status update — may match the best suggested note or be null.

Rules:
- Use ONLY facts implied by the user JSON (queue, arrival_state, role). Do not invent delays, parking, or people.
- British / neutral English; understated; respectful.
- If the thread already covers the situation (see recent_thread_lines), prefer null delay_prompt and fewer suggestions — do not repeat the same idea.
- Never promise exact times you cannot know from the JSON.
PROMPT,
                        ],
                        [
                            'role' => 'user',
                            'content' => 'Booking-thread assist context (JSON): '.$userJson,
                        ],
                    ],
                ]);
        } catch (\Throwable $e) {
            Log::warning('OpenAI visit-thread assist transport failed', [
                'message' => $e->getMessage(),
            ]);

            return null;
        }

        if (! $response->successful()) {
            Log::warning('OpenAI visit-thread assist HTTP error', [
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

        $delay = isset($decoded['delay_prompt']) && is_string($decoded['delay_prompt'])
            ? trim($decoded['delay_prompt'])
            : null;
        $delay = $delay === '' ? null : $delay;

        $notesRaw = $decoded['suggested_notes'] ?? [];
        $notes = [];
        if (is_array($notesRaw)) {
            foreach ($notesRaw as $line) {
                if (is_string($line) && trim($line) !== '') {
                    $notes[] = trim($line);
                }
            }
        }

        $status = isset($decoded['optional_status_line']) && is_string($decoded['optional_status_line'])
            ? trim($decoded['optional_status_line'])
            : null;
        $status = $status === '' ? null : $status;

        return [
            'delay_prompt' => $delay,
            'suggested_notes' => $notes,
            'optional_status_line' => $status,
        ];
    }

    /**
     * @param  list<string>  $modelNotes
     * @param  list<string>  $ruleNotes
     * @return list<string>
     */
    private function mergeNoteLists(array $modelNotes, array $ruleNotes): array
    {
        $seen = [];
        $out = [];
        foreach ([...$modelNotes, ...$ruleNotes] as $line) {
            $k = mb_strtolower(mb_substr($line, 0, 48));
            if (isset($seen[$k])) {
                continue;
            }
            $seen[$k] = true;
            $out[] = $line;
            if (count($out) >= 3) {
                break;
            }
        }

        return $out;
    }

    /**
     * @param  array{delay_prompt: string|null, suggested_notes: list<string>, optional_status_line: string|null}  $a
     * @return array{delay_prompt: string|null, suggested_notes: list<string>, optional_status_line: string|null}
     */
    private function sanitiseAssist(array $a): array
    {
        $dp = $a['delay_prompt'] !== null ? mb_substr($a['delay_prompt'], 0, 160) : null;
        $notes = [];
        foreach ($a['suggested_notes'] as $n) {
            $n = trim(mb_substr($n, 0, 120));
            if ($n !== '' && ! in_array($n, $notes, true)) {
                $notes[] = $n;
            }
            if (count($notes) >= 3) {
                break;
            }
        }
        $os = $a['optional_status_line'] !== null
            ? mb_substr(trim($a['optional_status_line']), 0, 120)
            : null;
        $os = $os === '' ? null : $os;

        return [
            'delay_prompt' => $dp,
            'suggested_notes' => $notes,
            'optional_status_line' => $os,
        ];
    }

    /**
     * @param  array{delay_prompt: string|null, suggested_notes: list<string>, optional_status_line: string|null}  $body
     * @return array{
     *     source: 'model'|'rules',
     *     generated_at: string,
     *     privacy: array{staff_only: string, third_party: string|null},
     *     delay_prompt: string|null,
     *     suggested_notes: list<string>,
     *     optional_status_line: string|null,
     * }
     */
    private function wrap(string $source, array $privacy, array $body): array
    {
        return [
            'source' => $source,
            'generated_at' => now()->toIso8601String(),
            'privacy' => $privacy,
            'delay_prompt' => $body['delay_prompt'],
            'suggested_notes' => $body['suggested_notes'],
            'optional_status_line' => $body['optional_status_line'],
        ];
    }

    private function thirdPartyPrivacyLine(): ?string
    {
        $apiKey = config('services.openai.api_key');

        return is_string($apiKey) && trim($apiKey) !== ''
            ? 'When enabled, phrasing suggestions may be processed by a third-party model. No email addresses are sent; context is limited to this booking’s operational snapshot and recent thread lines.'
            : null;
    }
}
