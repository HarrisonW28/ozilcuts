<?php

namespace App\Policies;

use App\Models\Appointment;
use App\Models\User;
use Carbon\CarbonImmutable;

class AppointmentPolicy
{
    public function view(User $user, Appointment $appointment): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $appointment->customer_user_id === $user->id
            || $appointment->barber_user_id === $user->id;
    }

    public function cancel(User $user, Appointment $appointment): bool
    {
        return $this->canMutate($user, $appointment);
    }

    public function reschedule(User $user, Appointment $appointment): bool
    {
        return $this->canMutate($user, $appointment);
    }

    /**
     * The customer who owned the source appointment may snooze its
     * smart-rebooking nudge. Admins may also snooze on a customer's
     * behalf for support flows.
     */
    public function snoozeRebookNudge(User $user, Appointment $appointment): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $appointment->customer_user_id === $user->id;
    }

    /**
     * Manual reminders may be triggered by an admin or by the assigned
     * barber on a confirmed, future appointment. Customers receive
     * reminders automatically via the scheduler and have no need to
     * fire one for themselves.
     */
    public function sendReminder(User $user, Appointment $appointment): bool
    {
        if ($appointment->status !== Appointment::STATUS_CONFIRMED) {
            return false;
        }
        $start = $appointment->starts_at;
        if ($start === null) {
            return false;
        }
        if (CarbonImmutable::parse((string) $start)->lessThanOrEqualTo(CarbonImmutable::now())) {
            return false;
        }
        if ($user->isAdmin()) {
            return true;
        }

        return $appointment->barber_user_id === $user->id;
    }

    /**
     * Let the customer know the barber is running late. Allowed for the
     * assigned barber or an admin while the booking window has not ended.
     */
    public function notifyRunningLate(User $user, Appointment $appointment): bool
    {
        if ($appointment->status !== Appointment::STATUS_CONFIRMED) {
            return false;
        }
        $end = $appointment->ends_at;
        if ($end === null) {
            return false;
        }
        if (CarbonImmutable::parse((string) $end)->lessThanOrEqualTo(CarbonImmutable::now())) {
            return false;
        }
        if ($user->isAdmin()) {
            return true;
        }

        return $appointment->barber_user_id === $user->id;
    }

    private function canMutate(User $user, Appointment $appointment): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        $isParticipant = $appointment->customer_user_id === $user->id
            || $appointment->barber_user_id === $user->id;
        if (! $isParticipant) {
            return false;
        }

        if ($appointment->status !== Appointment::STATUS_CONFIRMED) {
            return false;
        }

        $start = $appointment->starts_at;
        if ($start === null) {
            return false;
        }

        return CarbonImmutable::parse((string) $start)->greaterThan(CarbonImmutable::now());
    }
}
