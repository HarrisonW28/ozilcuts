<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Abuse protection master switch
    |--------------------------------------------------------------------------
    */

    'enabled' => (bool) env('ABUSE_PROTECTION_ENABLED', true),

    /*
    |--------------------------------------------------------------------------
    | Booking limits (self-service customer bookings only)
    |--------------------------------------------------------------------------
    |
    | Thresholds are intentionally generous to avoid blocking legitimate guests
    | who plan several visits or reschedule often.
    |
    */

    'booking' => [
        'max_per_hour' => (int) env('ABUSE_BOOKING_MAX_PER_HOUR', 8),
        'max_future_confirmed' => (int) env('ABUSE_BOOKING_MAX_FUTURE', 6),
        'max_unpaid_deposits' => (int) env('ABUSE_BOOKING_MAX_UNPAID_DEPOSITS', 3),
        'max_slot_attempts_per_10_minutes' => (int) env('ABUSE_BOOKING_SLOT_ATTEMPTS', 20),
    ],

    /*
    |--------------------------------------------------------------------------
    | Cancellation limits
    |--------------------------------------------------------------------------
    */

    'cancel' => [
        'max_per_day' => (int) env('ABUSE_CANCEL_MAX_PER_DAY', 12),
        'window_hours' => (int) env('ABUSE_CANCEL_WINDOW_HOURS', 24),
        'serial_pattern_cancels' => (int) env('ABUSE_CANCEL_SERIAL_CANCELS', 6),
        'serial_pattern_bookings' => (int) env('ABUSE_CANCEL_SERIAL_BOOKINGS', 6),
    ],

    /*
    |--------------------------------------------------------------------------
    | Visit-thread messaging (freeform notes; canned pings are exempt)
    |--------------------------------------------------------------------------
    */

    'messaging' => [
        'max_notes_per_appointment_per_hour' => (int) env('ABUSE_MSG_MAX_NOTES_PER_HOUR', 30),
        'duplicate_body_cooldown_seconds' => (int) env('ABUSE_MSG_DUPLICATE_COOLDOWN', 45),
        'max_links_per_note' => (int) env('ABUSE_MSG_MAX_LINKS', 4),
    ],

    /*
    |--------------------------------------------------------------------------
    | Registration / auth spam
    |--------------------------------------------------------------------------
    */

    'registration' => [
        'max_per_ip_per_day' => (int) env('ABUSE_REGISTER_MAX_PER_IP_DAY', 12),
    ],

    /*
    |--------------------------------------------------------------------------
    | Fraud signals (deposit hoarding, etc.)
    |--------------------------------------------------------------------------
    */

    'fraud' => [
        'block_unpaid_deposit_hoarding' => (bool) env('ABUSE_FRAUD_BLOCK_UNPAID', true),
    ],

];
