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
     * Customer may send a coarse location ping for geofenced arrival while the
     * booking is inside the on-site arrival window.
     */
    public function reportArrivalProximity(User $user, Appointment $appointment): bool
    {
        if ($appointment->customer_user_id !== $user->id) {
            return false;
        }

        if ($appointment->status !== Appointment::STATUS_CONFIRMED) {
            return false;
        }

        return $this->inArrivalWindow($appointment);
    }

    /**
     * Customer may mark themselves arrived; barber/admin advance the queue to
     * waiting and in-chair. All moves require a confirmed booking inside the
     * on-site arrival window.
     */
    public function updateArrival(User $user, Appointment $appointment, string $nextState): bool
    {
        if (! $this->inArrivalWindow($appointment)) {
            return false;
        }

        $current = (string) $appointment->arrival_state;

        if ($appointment->customer_user_id === $user->id) {
            return $current === Appointment::ARRIVAL_EXPECTED
                && $nextState === Appointment::ARRIVAL_ARRIVED;
        }

        if ($user->isAdmin()) {
            return $this->barberArrivalTransition($current, $nextState)
                || $this->customerArrivalTransition($current, $nextState);
        }

        if ($appointment->barber_user_id === $user->id) {
            return $this->barberArrivalTransition($current, $nextState);
        }

        return false;
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

    /**
     * Lightweight appointment thread: same visibility as the booking record.
     */
    public function viewMessages(User $user, Appointment $appointment): bool
    {
        return $this->view($user, $appointment);
    }

    /**
     * Short operational + note replies tied to this visit only (not open chat).
     */
    public function sendMessages(User $user, Appointment $appointment): bool
    {
        if (! $this->view($user, $appointment)) {
            return false;
        }
        if ($appointment->status !== Appointment::STATUS_CONFIRMED) {
            return false;
        }
        $end = $appointment->ends_at;
        if ($end === null) {
            return false;
        }
        $closesAt = CarbonImmutable::parse((string) $end)->addHours(24);
        if (CarbonImmutable::now()->greaterThan($closesAt)) {
            return false;
        }
        if ($appointment->customer_user_id === null) {
            return $user->isAdmin() || $appointment->barber_user_id === $user->id;
        }

        return $appointment->customer_user_id === $user->id
            || $appointment->barber_user_id === $user->id
            || $user->isAdmin();
    }

    public function markMessagesRead(User $user, Appointment $appointment): bool
    {
        return $this->viewMessages($user, $appointment);
    }

    public function viewAdjustments(User $user, Appointment $appointment): bool
    {
        return $this->view($user, $appointment);
    }

    public function requestAdjustment(User $user, Appointment $appointment): bool
    {
        return $this->canMutate($user, $appointment);
    }

    private function inArrivalWindow(Appointment $appointment): bool
    {
        if ($appointment->status !== Appointment::STATUS_CONFIRMED) {
            return false;
        }
        $start = $appointment->starts_at;
        $end = $appointment->ends_at;
        if ($start === null || $end === null) {
            return false;
        }
        $startAt = CarbonImmutable::parse((string) $start);
        $endAt = CarbonImmutable::parse((string) $end);
        $now = CarbonImmutable::now();

        return $now->greaterThanOrEqualTo($startAt->subHours(36))
            && $now->lessThanOrEqualTo($endAt->addMinutes(60));
    }

    private function customerArrivalTransition(string $current, string $next): bool
    {
        return $current === Appointment::ARRIVAL_EXPECTED
            && $next === Appointment::ARRIVAL_ARRIVED;
    }

    private function barberArrivalTransition(string $current, string $next): bool
    {
        return ($current === Appointment::ARRIVAL_ARRIVED && $next === Appointment::ARRIVAL_WAITING)
            || ($current === Appointment::ARRIVAL_WAITING && $next === Appointment::ARRIVAL_IN_CHAIR);
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
