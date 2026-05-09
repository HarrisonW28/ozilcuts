<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Appointment reminders run every 15 minutes. The service is idempotent
// (unique index on appointment_reminders) so overlapping runs are safe.
Schedule::command('appointments:send-reminders')
    ->everyFifteenMinutes()
    ->withoutOverlapping();
