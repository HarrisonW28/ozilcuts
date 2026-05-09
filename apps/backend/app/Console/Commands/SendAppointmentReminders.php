<?php

namespace App\Console\Commands;

use App\Services\Notifications\AppointmentReminderService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

/**
 * Dispatch any scheduled reminders that fall within the tolerance window
 * of "now". Intended to run on a cron every 15 minutes.
 */
final class SendAppointmentReminders extends Command
{
    protected $signature = 'appointments:send-reminders';

    protected $description = 'Dispatch scheduled appointment reminders that are due now.';

    public function handle(AppointmentReminderService $reminders): int
    {
        $sent = $reminders->dispatchScheduled(CarbonImmutable::now());

        $this->info("Sent {$sent} appointment reminder(s).");

        return self::SUCCESS;
    }
}
