<?php

namespace App\Services\Appointments;

use App\Models\Appointment;
use App\Models\Role;
use App\Models\User;
use App\Notifications\NotificationEvents;
use App\Services\Notifications\AppointmentNotificationPayload;
use App\Services\Notifications\NotificationService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Calm, once-per-visit staff pings for arrival milestones — in-app only.
 */
final class ArrivalPresenceNotificationService
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function guestCheckedIn(Appointment $appointment): void
    {
        if ((string) $appointment->arrival_state !== Appointment::ARRIVAL_ARRIVED) {
            return;
        }

        $appointment->loadMissing(['service', 'barber', 'customer']);

        $base = AppointmentNotificationPayload::build($appointment) + [
            'deep_link' => '/appointments/'.$appointment->id.'/check-in',
            'thread_group_key' => 'arrival_presence:'.$appointment->id,
            'headline' => 'Guest checked in',
        ];

        DB::transaction(function () use ($appointment, $base): void {
            $fresh = Appointment::query()->whereKey($appointment->id)->lockForUpdate()->first();
            if ($fresh === null || $fresh->arrival_checked_in_barber_notified_at !== null) {
                return;
            }

            foreach ($this->staffRecipients($fresh) as $recipient) {
                $audience = (int) $fresh->barber_user_id === (int) $recipient->id
                    ? 'barber'
                    : 'admin';
                $this->notifications->send(
                    $recipient,
                    NotificationEvents::STAFF_ARRIVAL_CHECKED_IN,
                    $base + [
                        'audience' => $audience,
                        'urgency' => 'operational',
                    ],
                    mail: null,
                );
            }

            $fresh->arrival_checked_in_barber_notified_at = now();
            $fresh->save();
        });
    }

    /**
     * @return Collection<int, User>
     */
    private function staffRecipients(Appointment $appointment): Collection
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
