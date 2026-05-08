<?php

namespace App\Notifications;

/**
 * Allow-list of notification event keys. New event types must be added here
 * and surfaced through the public preferences API and UI.
 */
final class NotificationEvents
{
    public const APPOINTMENT_CONFIRMED = 'appointment.confirmed';

    public const APPOINTMENT_CANCELLED = 'appointment.cancelled';

    public const APPOINTMENT_RESCHEDULED = 'appointment.rescheduled';

    /** @var list<string> */
    public const ALL = [
        self::APPOINTMENT_CONFIRMED,
        self::APPOINTMENT_CANCELLED,
        self::APPOINTMENT_RESCHEDULED,
    ];

    /** @var array<string, array{label: string, description: string}> */
    public const META = [
        self::APPOINTMENT_CONFIRMED => [
            'label' => 'Appointment confirmed',
            'description' => 'When a booking is confirmed.',
        ],
        self::APPOINTMENT_CANCELLED => [
            'label' => 'Appointment cancelled',
            'description' => 'When an appointment is cancelled.',
        ],
        self::APPOINTMENT_RESCHEDULED => [
            'label' => 'Appointment rescheduled',
            'description' => 'When an appointment is moved to a new time.',
        ],
    ];
}
