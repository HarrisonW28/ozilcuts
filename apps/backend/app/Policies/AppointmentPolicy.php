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
