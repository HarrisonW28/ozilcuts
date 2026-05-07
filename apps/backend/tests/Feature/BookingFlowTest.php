<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BarberAvailabilityWindow;
use App\Models\BarberProfile;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class BookingFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Freeze "now" to a known Sunday early-morning time so all weekday
        // calculations are deterministic and slots-in-the-past logic is
        // predictable across machines.
        Carbon::setTestNow(CarbonImmutable::create(2026, 5, 10, 6, 0, 0));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /**
     * @return array{User, BarberProfile, Service}
     */
    private function makeBookableBarber(): array
    {
        $barber = User::factory()->barber()->create();
        $profile = BarberProfile::factory()->create([
            'user_id' => $barber->id,
            'is_published' => true,
        ]);
        // Monday 09:00–12:00 (weekday = 1)
        BarberAvailabilityWindow::query()->create([
            'barber_profile_id' => $profile->id,
            'weekday' => 1,
            'starts_at' => '09:00:00',
            'ends_at' => '12:00:00',
        ]);

        $service = Service::factory()->create([
            'duration_minutes' => 30,
            'is_active' => true,
        ]);

        return [$barber, $profile, $service];
    }

    public function test_slots_endpoint_returns_open_slots_for_weekday(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();

        $response = $this->getJson(
            "/api/v1/barbers/{$barber->id}/slots?service_id={$service->id}&date=2026-05-11",
        );

        $response->assertOk()
            ->assertJsonPath('duration_minutes', 30)
            ->assertJsonCount(6, 'slots');
        // Six 30-min slots between 09:00 and 12:00.
        $this->assertSame('2026-05-11T09:00:00', $response->json('slots.0'));
        $this->assertSame('2026-05-11T11:30:00', $response->json('slots.5'));
    }

    public function test_slots_endpoint_excludes_overlapping_appointments(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();

        Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => User::factory()->create()->id,
            'starts_at' => '2026-05-11 10:00:00',
            'ends_at' => '2026-05-11 10:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $response = $this->getJson(
            "/api/v1/barbers/{$barber->id}/slots?service_id={$service->id}&date=2026-05-11",
        );

        $response->assertOk()->assertJsonCount(5, 'slots');
        $this->assertNotContains('2026-05-11T10:00:00', $response->json('slots'));
    }

    public function test_slots_endpoint_returns_empty_for_off_day(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();

        // 2026-05-12 is a Tuesday, no availability defined.
        $this->getJson(
            "/api/v1/barbers/{$barber->id}/slots?service_id={$service->id}&date=2026-05-12",
        )->assertOk()->assertJsonPath('slots', []);
    }

    public function test_book_appointment_requires_authentication(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();

        $this->postJson('/api/v1/appointments', [
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'starts_at' => '2026-05-11T09:00:00',
        ])->assertUnauthorized();
    }

    public function test_customer_can_book_an_open_slot(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();

        $this->withToken($customer->createToken('t')->plainTextToken)
            ->postJson('/api/v1/appointments', [
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'starts_at' => '2026-05-11T09:00:00',
                'notes' => 'First time visit',
            ])
            ->assertCreated()
            ->assertJsonPath('status', Appointment::STATUS_CONFIRMED)
            ->assertJsonPath('service.id', $service->id)
            ->assertJsonPath('barber.id', $barber->id)
            ->assertJsonPath('customer.id', $customer->id);

        $this->assertDatabaseHas('appointments', [
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-11 09:00:00',
            'ends_at' => '2026-05-11 09:30:00',
        ]);
    }

    public function test_book_rejects_slot_outside_availability(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();

        $this->withToken($customer->createToken('t')->plainTextToken)
            ->postJson('/api/v1/appointments', [
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'starts_at' => '2026-05-11T13:00:00',
            ])
            ->assertUnprocessable();
    }

    public function test_book_rejects_overlap_with_existing_appointment(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();

        Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => User::factory()->create()->id,
            'starts_at' => '2026-05-11 09:00:00',
            'ends_at' => '2026-05-11 09:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->withToken($customer->createToken('t')->plainTextToken)
            ->postJson('/api/v1/appointments', [
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'starts_at' => '2026-05-11T09:15:00',
            ])
            ->assertUnprocessable();
    }

    public function test_appointments_index_scopes_by_role(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();
        $customerA = User::factory()->create();
        $customerB = User::factory()->create();

        $apptA = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customerA->id,
            'starts_at' => '2026-05-11 09:00:00',
            'ends_at' => '2026-05-11 09:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);
        Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customerB->id,
            'starts_at' => '2026-05-11 10:00:00',
            'ends_at' => '2026-05-11 10:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->actingAs($customerA, 'sanctum')
            ->getJson('/api/v1/appointments')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $apptA->id);

        $this->actingAs($barber, 'sanctum')
            ->getJson('/api/v1/appointments')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $admin = User::factory()->admin()->create();
        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/appointments')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }
}
