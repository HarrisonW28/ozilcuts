<?php

namespace App\Services\Notifications;

use App\Mail\AppointmentStaffAlertMail;
use App\Models\Appointment;
use App\Models\Role;
use App\Models\User;
use App\Notifications\NotificationEvents;
use Illuminate\Support\Collection;

final class AppointmentStaffAlertService
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function bookingCreated(Appointment $appointment, ?User $actor = null): void
    {
        $this->dispatch(
            $appointment,
            NotificationEvents::STAFF_BOOKING_CREATED,
            actor: $actor,
        );
    }

    public function bookingCancelled(Appointment $appointment, ?User $actor = null): void
    {
        $this->dispatch(
            $appointment,
            NotificationEvents::STAFF_BOOKING_CANCELLED,
            actor: $actor,
        );
    }

    public function bookingRescheduled(
        Appointment $appointment,
        ?string $previousStartDisplay = null,
        ?string $previousStartIso = null,
        ?User $actor = null,
    ): void {
        $this->dispatch(
            $appointment,
            NotificationEvents::STAFF_BOOKING_RESCHEDULED,
            previousStartDisplay: $previousStartDisplay,
            previousStartIso: $previousStartIso,
            actor: $actor,
        );
    }

    private function dispatch(
        Appointment $appointment,
        string $eventType,
        ?string $previousStartDisplay = null,
        ?string $previousStartIso = null,
        ?User $actor = null,
    ): void {
        $appointment->loadMissing(['service', 'barber', 'customer']);
        $payload = AppointmentNotificationPayload::build(
            $appointment,
            previousStartsAt: $previousStartIso,
            actorName: $actor?->name,
        );

        foreach ($this->recipients($appointment) as $recipient) {
            $audience = (int) $appointment->barber_user_id === (int) $recipient->id
                ? 'barber'
                : 'admin';

            $this->notifications->send(
                $recipient,
                $eventType,
                $payload + ['audience' => $audience],
                mail: new AppointmentStaffAlertMail(
                    $appointment,
                    $eventType,
                    $audience,
                    previousStart: $previousStartDisplay,
                    actorName: $actor?->name,
                ),
            );
        }
    }

    /**
     * @return Collection<int, User>
     */
    private function recipients(Appointment $appointment): Collection
    {
        $users = collect();
        if ($appointment->barber !== null) {
            $users->push($appointment->barber);
        }

        $admins = User::query()
            ->whereHas('role', fn ($q) => $q->where('slug', Role::SLUG_ADMIN))
            ->get();

        return $users
            ->merge($admins)
            ->unique(fn (User $user) => (int) $user->id)
            ->values();
    }
}
