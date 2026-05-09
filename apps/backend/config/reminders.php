<?php

use App\Models\AppointmentReminder;

return [

    /*
    |--------------------------------------------------------------------------
    | Scheduled reminder offsets
    |--------------------------------------------------------------------------
    |
    | Each scheduled reminder has an offset (in minutes before the appointment
    | start time). The reminder runner picks up confirmed appointments whose
    | starts_at is within +/- tolerance_minutes of (now + offset_minutes) and
    | whose corresponding (appointment_id, kind) row hasn't been written yet.
    |
    */

    'kinds' => [
        AppointmentReminder::KIND_DAY_BEFORE => [
            'offset_minutes' => (int) env('REMINDER_DAY_BEFORE_MINUTES', 1440),
            'label' => '24-hour reminder',
        ],
        AppointmentReminder::KIND_HOUR_BEFORE => [
            'offset_minutes' => (int) env('REMINDER_HOUR_BEFORE_MINUTES', 120),
            'label' => '2-hour reminder',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Tolerance window
    |--------------------------------------------------------------------------
    |
    | How far either side of the offset the runner will still send a reminder.
    | Larger values are more forgiving when the scheduler is delayed; the
    | unique (appointment_id, kind) index prevents duplicates regardless.
    |
    */

    'tolerance_minutes' => (int) env('REMINDER_TOLERANCE_MINUTES', 30),

];
