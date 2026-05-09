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

    public const APPOINTMENT_REMINDER = 'appointment.reminder';

    public const APPOINTMENT_RUNNING_LATE = 'appointment.running_late';

    public const APPOINTMENT_REBOOK_SUGGESTED = 'appointment.rebook_suggested';

    public const APPOINTMENT_INACTIVITY_NUDGE = 'appointment.inactivity_nudge';

    public const STAFF_BOOKING_CREATED = 'staff.booking.created';

    public const STAFF_BOOKING_CANCELLED = 'staff.booking.cancelled';

    public const STAFF_BOOKING_RESCHEDULED = 'staff.booking.rescheduled';

    /** @var list<string> */
    public const OPERATIONAL_ALERTS = [
        self::STAFF_BOOKING_CREATED,
        self::STAFF_BOOKING_CANCELLED,
        self::STAFF_BOOKING_RESCHEDULED,
    ];

    /**
     * Customer-retention events. The retention dispatcher honours a
     * cross-event cooldown across this list so customers don't receive
     * stacked retention emails in a short window.
     *
     * @var list<string>
     */
    public const RETENTION_EVENTS = [
        self::APPOINTMENT_REBOOK_SUGGESTED,
        self::APPOINTMENT_INACTIVITY_NUDGE,
    ];

    /** @var list<string> */
    public const ALL = [
        self::APPOINTMENT_CONFIRMED,
        self::APPOINTMENT_CANCELLED,
        self::APPOINTMENT_RESCHEDULED,
        self::APPOINTMENT_REMINDER,
        self::APPOINTMENT_RUNNING_LATE,
        self::APPOINTMENT_REBOOK_SUGGESTED,
        self::APPOINTMENT_INACTIVITY_NUDGE,
        self::STAFF_BOOKING_CREATED,
        self::STAFF_BOOKING_CANCELLED,
        self::STAFF_BOOKING_RESCHEDULED,
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
        self::APPOINTMENT_REMINDER => [
            'label' => 'Appointment reminder',
            'description' => 'Reminders before an upcoming appointment (e.g. 24 hours and 2 hours before).',
        ],
        self::APPOINTMENT_RUNNING_LATE => [
            'label' => 'Running late notice',
            'description' => 'When your barber lets you know they are delayed for a booking.',
        ],
        self::APPOINTMENT_REBOOK_SUGGESTED => [
            'label' => 'Time for your next visit',
            'description' => 'Smart nudges around your usual cadence so you can rebook in one tap.',
        ],
        self::APPOINTMENT_INACTIVITY_NUDGE => [
            'label' => 'It\'s been a while',
            'description' => 'A friendly check-in if it\'s been noticeably longer than your usual time between visits.',
        ],
        self::STAFF_BOOKING_CREATED => [
            'label' => 'Staff alert: new booking',
            'description' => 'Operational alert for barbers and admins when a booking is created.',
        ],
        self::STAFF_BOOKING_CANCELLED => [
            'label' => 'Staff alert: cancellation',
            'description' => 'Operational alert for barbers and admins when a booking is cancelled.',
        ],
        self::STAFF_BOOKING_RESCHEDULED => [
            'label' => 'Staff alert: reschedule',
            'description' => 'Operational alert for barbers and admins when a booking is rescheduled.',
        ],
    ];
}
