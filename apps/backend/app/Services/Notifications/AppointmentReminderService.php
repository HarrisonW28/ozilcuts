<?php

namespace App\Services\Notifications;

use App\Mail\AppointmentReminderMail;
use App\Models\Appointment;
use App\Models\AppointmentReminder;
use App\Notifications\NotificationEvents;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/**
 * Computes which confirmed appointments are due for a reminder right now
 * and dispatches them through NotificationService. Idempotency for the
 * scheduled kinds (day_before / hour_before) is enforced by the
 * appointment_reminders.unique(appointment_id, kind) index. Manual
 * reminders are not recorded so admins can re-send freely.
 */
final class AppointmentReminderService
{
    public function __construct(private readonly NotificationService $notifications) {}

    /**
     * Dispatch any scheduled reminders that fall within the configured
     * tolerance window of `$now`. Returns the number of reminders
     * actually sent (excluding duplicates).
     */
    public function dispatchScheduled(CarbonImmutable $now): int
    {
        $kinds = (array) config('reminders.kinds', []);
        $tolerance = (int) config('reminders.tolerance_minutes', 30);
        $sent = 0;

        foreach ($kinds as $kind => $config) {
            if (! is_string($kind) || ! is_array($config)) {
                continue;
            }
            if (! in_array($kind, AppointmentReminder::SCHEDULED_KINDS, true)) {
                continue;
            }

            $offsetMinutes = (int) ($config['offset_minutes'] ?? 0);
            if ($offsetMinutes <= 0) {
                continue;
            }

            $center = $now->addMinutes($offsetMinutes);
            $from = $center->subMinutes($tolerance);
            $to = $center->addMinutes($tolerance);

            $candidates = Appointment::query()
                ->where('status', Appointment::STATUS_CONFIRMED)
                ->whereBetween('starts_at', [$from, $to])
                ->whereDoesntHave(
                    'reminders',
                    fn ($q) => $q->where('kind', $kind),
                )
                ->with(['service', 'barber', 'customer'])
                ->orderBy('starts_at')
                ->get();

            foreach ($candidates as $appointment) {
                if ($this->dispatch($appointment, $kind, $now)) {
                    $sent++;
                }
            }
        }

        return $sent;
    }

    /**
     * Dispatch a manual reminder right now. No idempotency check — admins
     * can fire this multiple times if a customer needs nudging.
     */
    public function dispatchManual(Appointment $appointment, CarbonImmutable $now): bool
    {
        $appointment->loadMissing(['service', 'barber', 'customer']);

        return $this->send(
            $appointment,
            headline: $this->headlineForKind('manual', $appointment),
            kind: 'manual',
        );
    }

    /**
     * Reserve an idempotency row first (insert is the source of truth) and
     * then dispatch the notification. If another runner has already
     * inserted the row, returns false without re-sending.
     */
    private function dispatch(Appointment $appointment, string $kind, CarbonImmutable $now): bool
    {
        $headline = $this->headlineForKind($kind, $appointment);

        try {
            DB::transaction(function () use ($appointment, $kind, $now): void {
                AppointmentReminder::query()->create([
                    'appointment_id' => $appointment->id,
                    'kind' => $kind,
                    'sent_at' => $now,
                ]);
            });
        } catch (QueryException $e) {
            // Unique violation on (appointment_id, kind) — another worker
            // has already sent this reminder. Silently skip.
            return false;
        }

        return $this->send($appointment, headline: $headline, kind: $kind);
    }

    private function send(Appointment $appointment, string $headline, ?string $kind = null): bool
    {
        $customer = $appointment->customer;
        if ($customer === null) {
            return false;
        }
        $payload = AppointmentNotificationPayload::build($appointment) + [
            'headline' => $headline,
        ];
        if ($kind !== null) {
            $payload['reminder_kind'] = $kind;
        }

        $this->notifications->send(
            $customer,
            NotificationEvents::APPOINTMENT_REMINDER,
            $payload,
            mail: new AppointmentReminderMail($appointment, $headline),
        );

        return true;
    }

    private function headlineForKind(string $kind, Appointment $appointment): string
    {
        $service = $appointment->service?->name ?? 'your visit';
        $starts = $appointment->starts_at;
        $timeBit = $starts !== null
            ? ' · '.$starts->timezone(config('app.timezone'))->format('g:i A')
            : '';

        return match ($kind) {
            AppointmentReminder::KIND_DAY_BEFORE => "Tomorrow · {$service}{$timeBit}",
            AppointmentReminder::KIND_HOUR_BEFORE => "Starting soon · {$service}{$timeBit}",
            'manual' => "Reminder · {$service}{$timeBit}",
            default => "Reminder · {$service}",
        };
    }
}
