<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BarberProfile;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ShopOperationalIntelligenceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-06-15 14:00:00');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_requires_authentication(): void
    {
        $this->getJson('/api/v1/operations/live')
            ->assertUnauthorized();
    }

    public function test_forbidden_for_customer(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/operations/live')
            ->assertForbidden();
    }

    public function test_barber_receives_multi_chair_snapshot(): void
    {
        $barberA = User::factory()->barber()->create(['name' => 'Alex']);
        $barberB = User::factory()->barber()->create(['name' => 'Jordan']);
        BarberProfile::factory()->create(['user_id' => $barberA->id, 'is_published' => true]);
        BarberProfile::factory()->create(['user_id' => $barberB->id, 'is_published' => true]);
        $service = Service::factory()->create(['duration_minutes' => 30, 'is_active' => true]);
        $customer = User::factory()->create();

        Appointment::factory()->create([
            'customer_user_id' => $customer->id,
            'barber_user_id' => $barberA->id,
            'service_id' => $service->id,
            'status' => Appointment::STATUS_CONFIRMED,
            'starts_at' => now()->subMinutes(10),
            'ends_at' => now()->addMinutes(20),
            'arrival_state' => Appointment::ARRIVAL_IN_CHAIR,
        ]);

        Appointment::factory()->create([
            'customer_user_id' => $customer->id,
            'barber_user_id' => $barberB->id,
            'service_id' => $service->id,
            'status' => Appointment::STATUS_CONFIRMED,
            'starts_at' => now()->addHours(2),
            'arrival_state' => Appointment::ARRIVAL_EXPECTED,
        ]);

        $this->actingAs($barberA, 'sanctum')
            ->getJson('/api/v1/operations/live')
            ->assertOk()
            ->assertJsonPath('data.snapshot_date', '2026-06-15')
            ->assertJsonPath('data.shop_summary.chairs_total', 2)
            ->assertJsonPath('data.shop_summary.chairs_in_use', 1)
            ->assertJsonCount(2, 'data.chairs');
    }

    public function test_admin_can_load_snapshot(): void
    {
        $admin = User::factory()->admin()->create();
        $barber = User::factory()->barber()->create();
        BarberProfile::factory()->create(['user_id' => $barber->id, 'is_published' => true]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/operations/live')
            ->assertOk()
            ->assertJsonPath('data.shop_summary.chairs_total', 1);
    }
}
