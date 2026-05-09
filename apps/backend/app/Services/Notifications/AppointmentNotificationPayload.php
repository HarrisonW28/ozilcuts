<?php

namespace App\Services\Notifications;

use App\Models\Appointment;

/**
 * Build the in-app notification payload for an appointment event. Kept
 * separate from NotificationService so multiple controllers can produce
 * the same payload shape without duplicating logic.
 */
final class AppointmentNotificationPayload
{
    /**
     * @return array{
     *     appointment_id: int,
     *     service_name: string|null,
     *     barber_name: string|null,
     *     customer_name: string|null,
     *     starts_at: string|null,
     *     previous_starts_at?: string|null,
     *     actor_name?: string|null,
     * }
     */
    public static function build(
        Appointment $appointment,
        ?string $previousStartsAt = null,
        ?string $actorName = null,
    ): array {
        $payload = [
            'appointment_id' => (int) $appointment->id,
            'service_name' => $appointment->service?->name,
            'barber_name' => $appointment->barber?->name,
            'customer_name' => $appointment->customer?->name,
            'starts_at' => $appointment->starts_at?->toIso8601String(),
        ];
        if ($previousStartsAt !== null) {
            $payload['previous_starts_at'] = $previousStartsAt;
        }
        if ($actorName !== null) {
            $payload['actor_name'] = $actorName;
        }

        return $payload;
    }
}
