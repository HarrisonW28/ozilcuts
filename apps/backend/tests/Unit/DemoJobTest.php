<?php

namespace Tests\Unit;

use App\Jobs\DemoJob;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class DemoJobTest extends TestCase
{
    public function test_demo_job_can_be_dispatched(): void
    {
        Queue::fake();

        DemoJob::dispatch('ping');

        Queue::assertPushed(DemoJob::class, fn (DemoJob $job): bool => $job->payload === 'ping');
    }
}
