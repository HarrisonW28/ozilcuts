<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Example queued job. Business logic should stay thin here and delegate to services.
 */
final class DemoJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $payload = 'demo',
    ) {}

    public function handle(): void
    {
        //
    }
}
