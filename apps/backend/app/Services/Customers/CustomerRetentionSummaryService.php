<?php

namespace App\Services\Customers;

use App\Models\Appointment;
use App\Models\CustomerProfile;
use App\Models\User;
use App\Services\Booking\RebookSuggestionService;
use App\Services\Notifications\SmartRebookNudgeService;
use Carbon\CarbonImmutable;

/**
 * Customer-facing retention snapshot: predicted cadence, dormancy signals,
 * and copy aligned with {@see SmartRebookNudgeService}.
 *
 * @return array{
 *     retention_paused: bool,
 *     has_upcoming_booking: bool,
 *     total_visits: int,
 *     rebook: array<string, mixed>|null,
 *     predicted: array<string, mixed>|null,
 *     signals: array{
 *         days_since_last_visit: int|null,
 *         typical_interval_days: int|null,
 *         suggested_date: string|null,
 *         due_soon: bool,
 *         dormant: bool,
 *         inactivity_threshold_days: int|null,
 *     },
 *     nudge: array{
 *         variant: string,
 *         tone: string,
 *         headline: string,
 *         body: string|null,
 *         cta_label: string,
 *         cta_href: string|null,
 *     },
 * }
 */
final class CustomerRetentionSummaryService
{
    /** @var list<int> */
    private const LOYALTY_MILESTONES = [3, 6, 10, 15, 25];

    public function __construct(
        private readonly RebookSuggestionService $suggestions,
    ) {}

    public function forCustomer(User $customer, CarbonImmutable $now): array
    {
        $retentionPaused = $this->retentionPaused($customer->id);
        $hasUpcoming = $this->hasUpcomingBooking($customer, $now);
        $nextUpcoming = $hasUpcoming
            ? $this->nextUpcomingAppointment($customer, $now)
            : null;
        $totalVisits = $this->countPastVisits($customer, $now);
        $latestPast = $this->latestPastAppointment($customer, $now);

        $rhythmSuggestion = $latestPast !== null
            ? $this->suggestions->forAppointment($latestPast)
            : null;

        $rebook = ! $hasUpcoming ? $this->suggestions->nextVisitFor($customer) : null;

        $signals = $this->buildSignals(
            now: $now,
            rhythmSuggestion: $rhythmSuggestion,
            latestPast: $latestPast,
            hasUpcoming: $hasUpcoming,
        );

        $predicted = $this->buildPredicted(
            nextUpcoming: $nextUpcoming,
            rebook: $rebook,
            rhythmSuggestion: $rhythmSuggestion,
        );

        $nudge = $this->buildNudge(
            retentionPaused: $retentionPaused,
            hasUpcoming: $hasUpcoming,
            nextUpcoming: $nextUpcoming,
            latestPast: $latestPast,
            rhythmSuggestion: $rhythmSuggestion,
            rebook: $rebook,
            signals: $signals,
            totalVisits: $totalVisits,
        );

        return [
            'retention_paused' => $retentionPaused,
            'has_upcoming_booking' => $hasUpcoming,
            'total_visits' => $totalVisits,
            'rebook' => $rebook,
            'predicted' => $predicted,
            'signals' => $signals,
            'nudge' => $nudge,
        ];
    }

    private function retentionPaused(int $userId): bool
    {
        $profile = CustomerProfile::query()
            ->where('user_id', $userId)
            ->first(['retention_paused']);

        return $profile !== null && (bool) ($profile->retention_paused ?? false);
    }

    private function hasUpcomingBooking(User $customer, CarbonImmutable $now): bool
    {
        return Appointment::query()
            ->where('customer_user_id', $customer->id)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->where('starts_at', '>=', $now)
            ->exists();
    }

    private function nextUpcomingAppointment(User $customer, CarbonImmutable $now): ?Appointment
    {
        return Appointment::query()
            ->where('customer_user_id', $customer->id)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->where('starts_at', '>=', $now)
            ->orderBy('starts_at')
            ->with(['service', 'barber'])
            ->first();
    }

    private function latestPastAppointment(User $customer, CarbonImmutable $now): ?Appointment
    {
        return Appointment::query()
            ->where('customer_user_id', $customer->id)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->where('starts_at', '<', $now)
            ->orderByDesc('starts_at')
            ->with(['service', 'barber'])
            ->first();
    }

    private function countPastVisits(User $customer, CarbonImmutable $now): int
    {
        return (int) Appointment::query()
            ->where('customer_user_id', $customer->id)
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->where('starts_at', '<', $now)
            ->count();
    }

    /**
     * @param  array<string, mixed>|null  $rhythmSuggestion
     * @return array{
     *     days_since_last_visit: int|null,
     *     typical_interval_days: int|null,
     *     suggested_date: string|null,
     *     due_soon: bool,
     *     dormant: bool,
     *     inactivity_threshold_days: int|null,
     * }
     */
    private function buildSignals(
        CarbonImmutable $now,
        ?array $rhythmSuggestion,
        ?Appointment $latestPast,
        bool $hasUpcoming,
    ): array {
        if ($rhythmSuggestion === null || $latestPast === null) {
            return [
                'days_since_last_visit' => null,
                'typical_interval_days' => null,
                'suggested_date' => null,
                'due_soon' => false,
                'dormant' => false,
                'inactivity_threshold_days' => null,
            ];
        }

        $startsAt = $latestPast->starts_at !== null
            ? CarbonImmutable::parse((string) $latestPast->starts_at)
            : null;
        $daysSinceLast = $startsAt !== null ? (int) $startsAt->diffInDays($now) : 0;

        $lead = (int) config('notifications.retention.rebook.lead_days', 1);
        $multiplier = (float) config('notifications.retention.inactivity.multiplier', 2.0);
        $minDays = (int) config('notifications.retention.inactivity.absolute_min_days', 45);
        $maxDays = (int) config('notifications.retention.inactivity.absolute_max_days', 0);

        $suggestedDate = CarbonImmutable::parse($rhythmSuggestion['suggested_date']);
        $dueCutoff = $now->addDays($lead)->startOfDay();
        $dueSoon = ! $hasUpcoming && ! $suggestedDate->greaterThan($dueCutoff);

        $threshold = max($minDays, (int) ceil($rhythmSuggestion['interval_days'] * $multiplier));
        $pastThreshold = $daysSinceLast >= $threshold;
        $withinMax = $maxDays <= 0 || $daysSinceLast <= $maxDays;
        $dormant = ! $hasUpcoming && $pastThreshold && $withinMax;

        return [
            'days_since_last_visit' => $daysSinceLast,
            'typical_interval_days' => $rhythmSuggestion['interval_days'],
            'suggested_date' => $rhythmSuggestion['suggested_date'],
            'due_soon' => $dueSoon,
            'dormant' => $dormant,
            'inactivity_threshold_days' => $threshold,
        ];
    }

    /**
     * @param  array<string, mixed>|null  $rebook
     * @param  array<string, mixed>|null  $rhythmSuggestion
     * @return array<string, mixed>|null
     */
    private function buildPredicted(
        ?Appointment $nextUpcoming,
        ?array $rebook,
        ?array $rhythmSuggestion,
    ): ?array {
        if ($nextUpcoming !== null && $nextUpcoming->starts_at !== null) {
            $start = CarbonImmutable::parse((string) $nextUpcoming->starts_at);

            return [
                'source' => 'booked',
                'date' => $start->toDateString(),
                'starts_at' => $start->toIso8601String(),
                'appointment_id' => $nextUpcoming->id,
                'typical_interval_days' => $rhythmSuggestion['interval_days'] ?? null,
            ];
        }

        if ($rebook !== null) {
            return [
                'source' => 'predicted',
                'date' => $rebook['suggested_date'],
                'starts_at' => null,
                'appointment_id' => null,
                'typical_interval_days' => $rebook['interval_days'],
            ];
        }

        return null;
    }

    /**
     * @param  array<string, mixed>|null  $rhythmSuggestion
     * @param  array<string, mixed>|null  $rebook
     * @param  array{
     *     days_since_last_visit: int|null,
     *     typical_interval_days: int|null,
     *     suggested_date: string|null,
     *     due_soon: bool,
     *     dormant: bool,
     *     inactivity_threshold_days: int|null,
     * }  $signals
     * @return array{
     *     variant: string,
     *     tone: string,
     *     headline: string,
     *     body: string|null,
     *     cta_label: string,
     *     cta_href: string|null,
     * }
     */
    private function buildNudge(
        bool $retentionPaused,
        bool $hasUpcoming,
        ?Appointment $nextUpcoming,
        ?Appointment $latestPast,
        ?array $rhythmSuggestion,
        ?array $rebook,
        array $signals,
        int $totalVisits,
    ): array {
        if ($retentionPaused) {
            return [
                'variant' => 'paused',
                'tone' => 'muted',
                'headline' => 'Rebooking reminders are paused',
                'body' => 'We won’t surface smart repeat prompts while this is off. You can turn reminders back on anytime in your notification settings.',
                'cta_label' => 'Notification settings',
                'cta_href' => '/profile/notifications',
            ];
        }

        if ($hasUpcoming && $nextUpcoming !== null) {
            $serviceName = $nextUpcoming->service?->name ?? 'Your cut';
            $barberName = $nextUpcoming->barber?->name;
            $when = $nextUpcoming->starts_at !== null
                ? CarbonImmutable::parse((string) $nextUpcoming->starts_at)->format('D, M j')
                : 'soon';

            $body = $barberName !== null
                ? "{$serviceName} with {$barberName} · {$when}."
                : "{$serviceName} · {$when}.";

            $loyalty = $this->loyaltySupplement($totalVisits);
            if ($loyalty !== null) {
                $body .= ' '.$loyalty;
            }

            return [
                'variant' => 'booked',
                'tone' => 'standard',
                'headline' => "You're on the books",
                'body' => $body,
                'cta_label' => 'View visit',
                'cta_href' => "/appointments/{$nextUpcoming->id}/confirmation",
            ];
        }

        if ($totalVisits < 1) {
            return [
                'variant' => 'welcome',
                'tone' => 'warm',
                'headline' => 'Find your rhythm',
                'body' => 'After a few finished visits we predict your ideal return date and nudge you at the right time.',
                'cta_label' => 'Book a cut',
                'cta_href' => '/book',
            ];
        }

        $barberName = $latestPast?->barber?->name;
        $serviceName = $latestPast?->service?->name ?? 'your usual';
        $barberFragment = $barberName ?? 'your barber';
        $datePretty = $signals['suggested_date'] !== null
            ? CarbonImmutable::parse($signals['suggested_date'])->format('D, M j')
            : null;

        if ($signals['dormant'] && $rhythmSuggestion !== null && $datePretty !== null) {
            $days = $signals['days_since_last_visit'] ?? 0;

            return [
                'variant' => 'dormant',
                'tone' => 'urgent',
                'headline' => 'We’ve missed you',
                'body' => "It’s been {$days} days since {$serviceName} with {$barberFragment}. Your usual timing points to around {$datePretty} — want to get back on track?",
                'cta_label' => 'Pick a time',
                'cta_href' => $rebook !== null ? $this->bookHrefFromSuggestion($rebook) : '/book',
            ];
        }

        if ($signals['due_soon'] && $rhythmSuggestion !== null && $datePretty !== null) {
            $body = "Based on your rhythm with {$barberFragment}, you’re in the window for a refresh. A sweet spot on the calendar is {$datePretty}.";
            $loyalty = $this->loyaltySupplement($totalVisits);
            if ($loyalty !== null) {
                $body .= ' '.$loyalty;
            }

            return [
                'variant' => 'due_soon',
                'tone' => 'warm',
                'headline' => 'You’re due soon',
                'body' => $body,
                'cta_label' => 'Repeat last cut',
                'cta_href' => $rebook !== null ? $this->bookHrefFromSuggestion($rebook) : '/book',
            ];
        }

        if ($rebook !== null && $datePretty !== null) {
            $body = "If you like staying consistent, {$barberFragment} and {$serviceName} line up around {$datePretty}.";
            $loyalty = $this->loyaltySupplement($totalVisits);
            if ($loyalty !== null) {
                $body .= ' '.$loyalty;
            }

            return [
                'variant' => 'steady',
                'tone' => 'standard',
                'headline' => 'Your next haircut',
                'body' => $body,
                'cta_label' => 'Book again',
                'cta_href' => $this->bookHrefFromSuggestion($rebook),
            ];
        }

        return [
            'variant' => 'reengage',
            'tone' => 'standard',
            'headline' => 'Lock your next visit',
            'body' => 'Book again with your favourite barber to keep your look on point.',
            'cta_label' => 'Browse times',
            'cta_href' => '/book',
        ];
    }

    private function loyaltySupplement(int $totalVisits): ?string
    {
        foreach (self::LOYALTY_MILESTONES as $milestone) {
            if ($totalVisits + 1 === $milestone) {
                return "Loyalty nod: one more visit until {$milestone} lifetime cuts with us.";
            }
        }

        if ($totalVisits >= 25) {
            return 'Thanks for being one of our most loyal regulars.';
        }

        return null;
    }

    /**
     * @param  array{
     *     service_id: int,
     *     barber_user_id: int,
     *     suggested_date: string,
     * }  $suggestion
     */
    private function bookHrefFromSuggestion(array $suggestion): string
    {
        $query = http_build_query([
            'service_id' => $suggestion['service_id'],
            'barber_user_id' => $suggestion['barber_user_id'],
            'date' => $suggestion['suggested_date'],
            'express' => '1',
        ]);

        return '/book?'.$query;
    }
}
