<?php

namespace App\Console\Commands;

use App\Services\Notifications\SmartRebookNudgeService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

/**
 * Walks customers who are around their typical rebooking cadence and
 * sends a single "time for your next visit" nudge per source appointment.
 * Idempotent — safe to overlap or re-run.
 */
final class SendRebookNudges extends Command
{
    protected $signature = 'appointments:send-rebook-nudges';

    protected $description = 'Dispatch smart rebooking nudges to customers due for their next visit.';

    public function handle(SmartRebookNudgeService $service): int
    {
        $sent = $service->dispatchDue(CarbonImmutable::now());

        $this->info("Sent {$sent} rebook nudge(s).");

        return self::SUCCESS;
    }
}
