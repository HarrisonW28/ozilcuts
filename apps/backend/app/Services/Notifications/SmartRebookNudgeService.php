<?php

namespace App\Services\Notifications;

use App\Mail\AppointmentInactivityNudgeMail;
use App\Mail\AppointmentRebookSuggestedMail;
use App\Models\Appointment;
use App\Models\AppointmentRebookNudge;
use App\Models\CustomerProfile;
use App\Models\Role;
use App\Notifications\NotificationEvents;
use App\Services\Booking\RebookSuggestionService;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/**
 * Coordinates the customer-retention nudge stack.
 *
 * Two distinct nudges share this dispatcher and the
 * `appointment_rebook_nudges` table:
 *
 *  - `kind = due`: the customer is around their typical rebooking
 *    cadence. Event: `appointment.rebook_suggested`.
 *  - `kind = inactivity`: materially past their usual gap. Event:
 *    `appointment.inactivity_nudge`.
 *
 * Idempotency: unique `(source_appointment_id, kind)`. Cooldown uses
 * `sent_at` on any kind. Master pause: `customer_profiles.retention_paused`.
 */
final class SmartRebookNudgeService
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly RebookSuggestionService $suggestions,
    ) {}

    /**
     * @return iterable<Appointment>
     */
    public function eachRetentionCandidate(CarbonImmutable $now): iterable
    {
        return $this->candidateLatestAppointments($now);
    }

    /**
     * Admin preview: who would match due-soon vs inactivity rules right now
     * (no sends).
     *
     * @return array{
     *     due_soon: list<array<string, mixed>>,
     *     inactive_eligible: list<array<string, mixed>>,
     * }
     */
    public function retentionSnapshot(CarbonImmutable $now): array
    {
        $lead = (int) config('notifications.retention.rebook.lead_days', 1);
        $multiplier = (float) config('notifications.retention.inactivity.multiplier', 2.0);
        $minDays = (int) config('notifications.retention.inactivity.absolute_min_days', 45);
        $maxDays = (int) config('notifications.retention.inactivity.absolute_max_days', 0);

        $dueSoon = [];
        $inactiveEligible = [];

        foreach ($this->candidateLatestAppointments($now) as $appointment) {
            $suggestion = $this->suggestions->forAppointment($appointment);
            if ($suggestion === null) {
                continue;
            }

            $customer = $appointment->customer;
            if ($customer === null) {
                continue;
            }

            $suggestedDate = CarbonImmutable::parse($suggestion['suggested_date']);
            $dueCutoff = $now->addDays($lead)->startOfDay();
            $isDueSoon = ! $suggestedDate->greaterThan($dueCutoff);

            $startsAt = $appointment->starts_at !== null
                ? CarbonImmutable::parse((string) $appointment->starts_at)
                : null;
            $daysSinceLast = $startsAt !== null ? (int) $startsAt->diffInDays($now) : 0;
            $threshold = max($minDays, (int) ceil($suggestion['interval_days'] * $multiplier));
            $pastThreshold = $daysSinceLast >= $threshold;
            $withinMax = $maxDays <= 0 || $daysSinceLast <= $maxDays;
            $isInactiveEligible = $pastThreshold && $withinMax;

            $base = [
                'appointment_id' => $appointment->id,
                'customer_user_id' => $customer->id,
                'customer_name' => $customer->name,
                'customer_email' => $customer->email,
                'last_visit_at' => $appointment->starts_at?->toIso8601String(),
                'interval_days' => $suggestion['interval_days'],
                'suggested_date' => $suggestion['suggested_date'],
                'days_since_last_visit' => $daysSinceLast,
                'inactivity_threshold_days' => $threshold,
                'retention_paused' => $this->retentionPaused($customer->id),
            ];

            if ($isDueSoon) {
                $dueSoon[] = $base;
            }
            if ($isInactiveEligible) {
                $inactiveEligible[] = $base;
            }
        }

        return [
            'due_soon' => $dueSoon,
            'inactive_eligible' => $inactiveEligible,
        ];
    }

    public function dispatchDue(CarbonImmutable $now, ?int $leadDays = null): int
    {
        $lead = $leadDays ?? (int) config('notifications.retention.rebook.lead_days', 1);
        $sent = 0;

        foreach ($this->candidateLatestAppointments($now) as $appointment) {
            $suggestion = $this->suggestions->forAppointment($appointment);
            if ($suggestion === null) {
                continue;
            }

            $suggestedDate = CarbonImmutable::parse($suggestion['suggested_date']);
            if ($suggestedDate->greaterThan($now->addDays($lead)->startOfDay())) {
                continue;
            }

            if ($this->sendOne($appointment, $suggestion, $now, AppointmentRebookNudge::KIND_DUE)) {
                $sent++;
            }
        }

        return $sent;
    }

    public function dispatchDueInactive(CarbonImmutable $now): int
    {
        $multiplier = (float) config('notifications.retention.inactivity.multiplier', 2.0);
        $minDays = (int) config('notifications.retention.inactivity.absolute_min_days', 45);
        $maxDays = (int) config('notifications.retention.inactivity.absolute_max_days', 0);
        $sent = 0;

        foreach ($this->candidateLatestAppointments($now) as $appointment) {
            $suggestion = $this->suggestions->forAppointment($appointment);
            if ($suggestion === null) {
                continue;
            }

            $startsAt = $appointment->starts_at !== null
                ? CarbonImmutable::parse((string) $appointment->starts_at)
                : null;
            if ($startsAt === null) {
                continue;
            }

            $daysSinceLast = (int) $startsAt->diffInDays($now);
            $threshold = max($minDays, (int) ceil($suggestion['interval_days'] * $multiplier));
            if ($daysSinceLast < $threshold) {
                continue;
            }
            if ($maxDays > 0 && $daysSinceLast > $maxDays) {
                continue;
            }

            if ($this->sendOne($appointment, $suggestion, $now, AppointmentRebookNudge::KIND_INACTIVITY)) {
                $sent++;
            }
        }

        return $sent;
    }

    /**
     * @param  array{
     *     interval_days: int,
     *     sample_size: int,
     *     suggested_date: string,
     *     last_appointment_at: string|null,
     *     barber_user_id: int,
     *     service_id: int,
     * }  $suggestion
     */
    public function sendOne(
        Appointment $appointment,
        array $suggestion,
        CarbonImmutable $now,
        string $kind = AppointmentRebookNudge::KIND_DUE,
    ): bool {
        if (! in_array($kind, AppointmentRebookNudge::KINDS, true)) {
            return false;
        }

        $customer = $appointment->customer;
        if ($customer === null) {
            return false;
        }

        if ($this->retentionPaused($customer->id)) {
            return false;
        }

        $cooldownDays = (int) config('notifications.retention.cooldown_days', 14);
        if ($cooldownDays > 0 && $this->withinRetentionCooldown($customer->id, $now, $cooldownDays)) {
            return false;
        }

        try {
            $reserved = DB::transaction(function () use ($appointment, $now, $kind): bool {
                $existing = AppointmentRebookNudge::query()
                    ->where('source_appointment_id', $appointment->id)
                    ->where('kind', $kind)
                    ->lockForUpdate()
                    ->first();

                if ($existing === null) {
                    AppointmentRebookNudge::query()->create([
                        'source_appointment_id' => $appointment->id,
                        'user_id' => $appointment->customer_user_id,
                        'kind' => $kind,
                        'state' => AppointmentRebookNudge::STATE_SENT,
                        'sent_at' => $now,
                        'snooze_until' => null,
                    ]);

                    return true;
                }

                if ($existing->state === AppointmentRebookNudge::STATE_SENT) {
                    return false;
                }

                if (
                    $existing->snooze_until !== null
                    && CarbonImmutable::parse((string) $existing->snooze_until)->greaterThan($now)
                ) {
                    return false;
                }

                $existing->update([
                    'state' => AppointmentRebookNudge::STATE_SENT,
                    'sent_at' => $now,
                    'snooze_until' => null,
                ]);

                return true;
            });
        } catch (QueryException) {
            return false;
        }

        if (! $reserved) {
            return false;
        }

        $payload = AppointmentNotificationPayload::build($appointment) + [
            'suggested_date' => $suggestion['suggested_date'],
            'interval_days' => $suggestion['interval_days'],
            'service_id' => $suggestion['service_id'],
            'barber_user_id' => $suggestion['barber_user_id'],
            'kind' => $kind,
        ];

        if ($kind === AppointmentRebookNudge::KIND_INACTIVITY) {
            $this->notifications->send(
                $customer,
                NotificationEvents::APPOINTMENT_INACTIVITY_NUDGE,
                $payload,
                mail: new AppointmentInactivityNudgeMail($appointment, $suggestion),
            );
        } else {
            $this->notifications->send(
                $customer,
                NotificationEvents::APPOINTMENT_REBOOK_SUGGESTED,
                $payload,
                mail: new AppointmentRebookSuggestedMail($appointment, $suggestion),
            );
        }

        return true;
    }

    public function snooze(Appointment $appointment, int $days, CarbonImmutable $now): AppointmentRebookNudge
    {
        $clamped = max(1, min(365, $days));
        $until = $now->addDays($clamped);

        return AppointmentRebookNudge::query()->updateOrCreate(
            [
                'source_appointment_id' => $appointment->id,
                'kind' => AppointmentRebookNudge::KIND_DUE,
            ],
            [
                'user_id' => $appointment->customer_user_id,
                'state' => AppointmentRebookNudge::STATE_SNOOZED,
                'snooze_until' => $until,
            ],
        );
    }

    private function retentionPaused(int $userId): bool
    {
        $profile = CustomerProfile::query()
            ->where('user_id', $userId)
            ->first(['retention_paused']);

        return $profile !== null && (bool) ($profile->retention_paused ?? false);
    }

    private function withinRetentionCooldown(
        int $userId,
        CarbonImmutable $now,
        int $cooldownDays,
    ): bool {
        $cutoff = $now->subDays($cooldownDays);

        return AppointmentRebookNudge::query()
            ->where('user_id', $userId)
            ->where('state', AppointmentRebookNudge::STATE_SENT)
            ->where('sent_at', '>=', $cutoff)
            ->exists();
    }

    /**
     * @return iterable<Appointment>
     */
    private function candidateLatestAppointments(CarbonImmutable $now): iterable
    {
        $hasUpcoming = Appointment::query()
            ->select('customer_user_id')
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->where('starts_at', '>=', $now)
            ->groupBy('customer_user_id');

        $latestPerCustomer = Appointment::query()
            ->selectRaw('customer_user_id, MAX(starts_at) AS latest_at')
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->where('starts_at', '<', $now)
            ->whereNotIn('customer_user_id', $hasUpcoming)
            ->whereHas(
                'customer.role',
                fn ($q) => $q->where('slug', Role::SLUG_CUSTOMER),
            )
            ->groupBy('customer_user_id')
            ->get();

        foreach ($latestPerCustomer as $row) {
            $appointment = Appointment::query()
                ->where('customer_user_id', $row->customer_user_id)
                ->where('status', Appointment::STATUS_CONFIRMED)
                ->where('starts_at', $row->latest_at)
                ->with(['service', 'barber', 'customer'])
                ->first();

            if ($appointment !== null) {
                yield $appointment;
            }
        }
    }
}
