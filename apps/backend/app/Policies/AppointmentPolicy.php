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
