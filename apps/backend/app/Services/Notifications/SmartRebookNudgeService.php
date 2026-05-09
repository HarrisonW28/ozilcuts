<?php

namespace App\Services\Notifications;

use App\Mail\AppointmentRebookSuggestedMail;
use App\Models\Appointment;
use App\Models\AppointmentRebookNudge;
use App\Models\Role;
use App\Notifications\NotificationEvents;
use App\Services\Booking\RebookSuggestionService;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/**
 * Decides which customers are around their typical rebooking cadence and
 * dispatches a single "time for your next visit" nudge per source
 * appointment. Idempotency is enforced at the DB layer by a unique index
 * on appointment_rebook_nudges.source_appointment_id.
 *
 * Customers can defer a nudge by snoozing; once snooze_until passes the
 * dispatcher re-evaluates and may resend (updating the same row in
 * place).
 */
final class SmartRebookNudgeService
{
    /**
     * Maximum days the suggested date may be ahead of "today" before we
     * still consider the customer "due now". 0 means dispatch only when
     * the suggested date is today or earlier; larger values let us nudge
     * a little ahead of the predicted date.
     */
    private const DEFAULT_LEAD_DAYS = 1;

    public function __construct(
        private readonly NotificationService $notifications,
        private readonly RebookSuggestionService $suggestions,
    ) {}

    /**
     * Walk customers whose latest confirmed past appointment makes them
     * due for a nudge right now, and dispatch where eligible. Returns the
     * count of nudges actually sent.
     */
    public function dispatchDue(CarbonImmutable $now, ?int $leadDays = null): int
    {
        $lead = $leadDays ?? self::DEFAULT_LEAD_DAYS;
        $sent = 0;

        foreach ($this->candidateLatestAppointments($now) as $appointment) {
            $suggestion = $this->suggestions->forAppointment($appointment);
            if ($suggestion === null) {
                continue;
            }

            $suggestedDate = CarbonImmutable::parse($suggestion['suggested_date']);
            if ($suggestedDate->greaterThan($now->addDays($lead)->startOfDay())) {
                // Not due yet; bail and let a later run pick it up.
                continue;
            }

            if ($this->sendOne($appointment, $suggestion, $now)) {
                $sent++;
            }
        }

        return $sent;
    }

    /**
     * Reserve / update the nudge row and send the notification. Skips if
     * an existing 'sent' row exists, or a 'snoozed' row whose
     * snooze_until is still in the future.
     *
     * @param  array{
     *     interval_days: int,
     *     sample_size: int,
     *     suggested_date: string,
     *     last_appointment_at: string|null,
     *     barber_user_id: int,
     *     service_id: int,
     * }  $suggestion
     */
    public function sendOne(Appointment $appointment, array $suggestion, CarbonImmutable $now): bool
    {
        $customer = $appointment->customer;
        if ($customer === null) {
            return false;
        }

        // Reserve the dispatch row first so concurrent runners don't
        // double-fire. We use a transaction + unique index for the
        // first-time case, and an explicit eligibility check for the
        // snooze-expiry path.
        try {
            $reserved = DB::transaction(function () use ($appointment, $now): bool {
                $existing = AppointmentRebookNudge::query()
                    ->where('source_appointment_id', $appointment->id)
                    ->lockForUpdate()
                    ->first();

                if ($existing === null) {
                    AppointmentRebookNudge::query()->create([
                        'source_appointment_id' => $appointment->id,
                        'user_id' => $appointment->customer_user_id,
                        'state' => AppointmentRebookNudge::STATE_SENT,
                        'sent_at' => $now,
                        'snooze_until' => null,
                    ]);

                    return true;
                }

                if ($existing->state === AppointmentRebookNudge::STATE_SENT) {
                    return false;
                }

                // Snoozed: only re-send once snooze_until has elapsed.
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
            // Unique violation on a concurrent insert — another worker
            // beat us to it. Treat as "already handled".
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
        ];

        $this->notifications->send(
            $customer,
            NotificationEvents::APPOINTMENT_REBOOK_SUGGESTED,
            $payload,
            mail: new AppointmentRebookSuggestedMail($appointment, $suggestion),
        );

        return true;
    }

    /**
     * Defer the nudge for this source appointment. Creates the row if it
     * doesn't exist yet (so a customer can pre-emptively opt out before
     * the first dispatch fires).
     */
    public function snooze(Appointment $appointment, int $days, CarbonImmutable $now): AppointmentRebookNudge
    {
        $clamped = max(1, min(365, $days));
        $until = $now->addDays($clamped);

        return AppointmentRebookNudge::query()->updateOrCreate(
            ['source_appointment_id' => $appointment->id],
            [
                'user_id' => $appointment->customer_user_id,
                'state' => AppointmentRebookNudge::STATE_SNOOZED,
                'snooze_until' => $until,
            ],
        );
    }

    /**
     * Iterator of "latest confirmed past appointment per eligible
     * customer". A customer is eligible if they have at least one
     * confirmed past appointment AND no upcoming confirmed booking.
     *
     * @return iterable<Appointment>
     */
    private function candidateLatestAppointments(CarbonImmutable $now): iterable
    {
        // Customers who already have a future confirmed appointment are
        // skipped — there's nothing to nudge them about.
        $hasUpcoming = Appointment::query()
            ->select('customer_user_id')
            ->where('status', Appointment::STATUS_CONFIRMED)
            ->where('starts_at', '>=', $now)
            ->groupBy('customer_user_id');

        // The MAX(starts_at) per customer of past confirmed appointments
        // is the source we suggest from.
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
