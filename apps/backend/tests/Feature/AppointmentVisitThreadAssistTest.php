<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class AppointmentVisitThreadAssistTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(CarbonImmutable::create(2026, 6, 11, 11, 0, 0));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_customer_receives_rules_based_assist_in_arrival_window(): void
    {
        Config::set('services.openai.api_key', null);

        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create();
        $customer = User::factory()->create();
        $appt = Appointment::factory()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-06-12 10:00:00',
            'ends_at' => '2026-06-12 10:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
            'arrival_state' => Appointment::ARRIVAL_EXPECTED,
        ]);

        $res = $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/visit-thread-assist")
            ->assertOk()
            ->json();

        $this->assertSame('rules', $res['source']);
        $this->assertArrayHasKey('suggested_notes', $res);
        $this->assertNotEmpty($res['suggested_notes']);
        $this->assertLessThanOrEqual(3, count($res['suggested_notes']));
    }

    public function test_stranger_cannot_access_assist(): void
    {
        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create();
        $customer = User::factory()->create();
        $stranger = User::factory()->create();
        $appt = Appointment::factory()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-06-12 10:00:00',
            'ends_at' => '2026-06-12 10:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->actingAs($stranger, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/visit-thread-assist")
            ->assertForbidden();
    }
}
