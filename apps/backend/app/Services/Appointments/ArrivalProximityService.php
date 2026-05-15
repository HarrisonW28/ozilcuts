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

final class ArrivalProximityService
{
    /** Soft geofence — generous so GPS drift does not strand guests. */
    public const GEOFENCE_RADIUS_M = 220;

    private const WALK_METRES_PER_MINUTE = 78;

    public function __construct(private readonly NotificationService $notifications) {}

    /**
     * @return array{
     *     within_geofence: bool,
     *     distance_m: float|null,
     *     approximate_eta_minutes: int|null,
     *     customer_notified: bool,
     *     barber_notified: bool,
     * }
     */
    public function recordPing(Appointment $appointment, User $customer, float $lat, float $lng): array
    {
        $appointment->loadMissing(['service', 'barber', 'customer']);

        $barber = $appointment->barber;
        if ($barber === null) {
            return $this->emptyResult(false);
        }

        $shopLat = $barber->shop_latitude;
        $shopLng = $barber->shop_longitude;
        if ($shopLat === null || $shopLng === null) {
            return $this->emptyResult(false);
        }

        $distance = $this->distanceMeters($lat, $lng, (float) $shopLat, (float) $shopLng);
        $within = $distance <= self::GEOFENCE_RADIUS_M;

        if (! $within) {
            return [
                'within_geofence' => false,
                'distance_m' => round($distance, 1),
                'approximate_eta_minutes' => null,
                'customer_notified' => false,
                'barber_notified' => false,
            ];
        }

        $eta = max(1, (int) round($distance / self::WALK_METRES_PER_MINUTE));
        $bucketM = (int) (round($distance / 25) * 25);

        $deepLink = '/appointments/'.$appointment->id.'/check-in';

        $base = AppointmentNotificationPayload::build($appointment) + [
            'approximate_eta_minutes' => $eta,
            'distance_bucket_m' => $bucketM,
            'deep_link' => $deepLink,
            'thread_group_key' => 'arrival_proximity:'.$appointment->id,
        ];

        $customerNotified = false;
        $barberNotified = false;

        DB::transaction(function () use (
            $appointment,
            $customer,
            $base,
            &$customerNotified,
            &$barberNotified,
        ): void {
            $fresh = Appointment::query()->whereKey($appointment->id)->lockForUpdate()->first();
            if ($fresh === null) {
                return;
            }

            if ($fresh->arrival_nearby_customer_notified_at === null) {
                $this->notifications->send(
                    $customer,
                    NotificationEvents::APPOINTMENT_ARRIVAL_NEARBY,
                    $base + ['urgency' => 'standard'],
                    mail: null,
                );
                $fresh->arrival_nearby_customer_notified_at = now();
                $customerNotified = true;
            }

            if ($fresh->arrival_nearby_barber_notified_at === null) {
                foreach ($this->staffRecipients($fresh) as $recipient) {
                    $audience = (int) $fresh->barber_user_id === (int) $recipient->id
                        ? 'barber'
                        : 'admin';
                    $this->notifications->send(
                        $recipient,
                        NotificationEvents::STAFF_ARRIVAL_NEARBY,
                        $base + [
                            'audience' => $audience,
                            'urgency' => 'operational',
                        ],
                        mail: null,
                    );
                }
                $fresh->arrival_nearby_barber_notified_at = now();
                $barberNotified = true;
            }

            $fresh->save();
        });

        return [
            'within_geofence' => true,
            'distance_m' => round($distance, 1),
            'approximate_eta_minutes' => $eta,
            'customer_notified' => $customerNotified,
            'barber_notified' => $barberNotified,
        ];
    }

    /**
     * @return array{
     *     within_geofence: bool,
     *     distance_m: float|null,
     *     approximate_eta_minutes: int|null,
     *     customer_notified: bool,
     *     barber_notified: bool,
     * }
     */
    private function emptyResult(bool $within): array
    {
        return [
            'within_geofence' => $within,
            'distance_m' => null,
            'approximate_eta_minutes' => null,
            'customer_notified' => false,
            'barber_notified' => false,
        ];
    }

    private function distanceMeters(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earth = 6371000.0;
        $φ1 = deg2rad($lat1);
        $φ2 = deg2rad($lat2);
        $Δφ = deg2rad($lat2 - $lat1);
        $Δλ = deg2rad($lon2 - $lon1);

        $a = sin($Δφ / 2) ** 2 + cos($φ1) * cos($φ2) * sin($Δλ / 2) ** 2;

        return $earth * 2 * atan2(sqrt($a), sqrt(1 - $a));
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
