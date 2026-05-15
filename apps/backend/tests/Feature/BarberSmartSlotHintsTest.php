<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class BarberSmartSlotHintsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(CarbonImmutable::create(2026, 9, 1, 10, 0, 0));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_guest_gets_non_personalized_hints(): void
    {
        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create();

        $this->getJson(
            "/api/v1/barbers/{$barber->id}/smart-slot-hints?service_id={$service->id}&date=2026-09-05",
        )
            ->assertOk()
            ->assertJsonPath('personalized', false)
            ->assertJsonPath('preferred_time_windows', [])
            ->assertJsonPath('affinity', null)
            ->assertJsonPath('repeat_booking', null);
    }

    public function test_customer_sees_preferred_windows_and_affinity(): void
    {
        $barber = User::factory()->barber()->create();
        $customer = User::factory()->create();
        $service = Service::factory()->create();

        foreach (['2026-08-01 14:00:00', '2026-08-15 14:30:00', '2026-08-20 14:00:00'] as $start) {
            Appointment::query()->create([
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'customer_user_id' => $customer->id,
                'starts_at' => $start,
                'ends_at' => CarbonImmutable::parse($start)->addMinutes(30)->toDateTimeString(),
                'status' => Appointment::STATUS_CONFIRMED,
                'arrival_state' => Appointment::ARRIVAL_EXPECTED,
                'notes' => null,
                'deposit_cents' => 0,
                'payment_status' => Appointment::PAYMENT_NOT_REQUIRED,
                'amount_paid_cents' => 0,
                'paid_at' => null,
                'refunded_at' => null,
            ]);
        }

        $res = $this->actingAs($customer, 'sanctum')
            ->getJson(
                "/api/v1/barbers/{$barber->id}/smart-slot-hints?service_id={$service->id}&date=2026-09-10",
            )
            ->assertOk()
            ->assertJsonPath('personalized', true)
            ->assertJsonPath('preferred_time_windows.0.hour_start', 14);

        $this->assertIsInt($res->json('affinity.score'));
        $this->assertGreaterThan(40, $res->json('affinity.score'));
        $this->assertIsString($res->json('repeat_booking.predicted_next_date'));
    }

    public function test_recent_cancellation_surfaces_hint(): void
    {
        $barber = User::factory()->barber()->create();
        $customer = User::factory()->create();
        $service = Service::factory()->create();

        Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-09-05 11:00:00',
            'ends_at' => '2026-09-05 11:30:00',
            'status' => Appointment::STATUS_CANCELLED,
            'arrival_state' => Appointment::ARRIVAL_EXPECTED,
            'notes' => null,
            'deposit_cents' => 0,
            'payment_status' => Appointment::PAYMENT_NOT_REQUIRED,
            'amount_paid_cents' => 0,
            'paid_at' => null,
            'refunded_at' => null,
        ]);

        $res = $this->getJson(
            "/api/v1/barbers/{$barber->id}/smart-slot-hints?service_id={$service->id}&date=2026-09-05",
        )
            ->assertOk()
            ->assertJsonPath('cancellation_match.recent_cancellations_on_day', 1);

        $this->assertIsString($res->json('cancellation_match.hint'));
        $this->assertGreaterThan(5, strlen($res->json('cancellation_match.hint')));
    }

    public function test_non_barber_returns_404(): void
    {
        $customer = User::factory()->create();
        $service = Service::factory()->create();

        $this->getJson(
            "/api/v1/barbers/{$customer->id}/smart-slot-hints?service_id={$service->id}&date=2026-09-05",
        )->assertNotFound();
    }
}
