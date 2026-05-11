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

class StaffBookingFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(CarbonImmutable::create(2026, 5, 10, 6, 0, 0));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /**
     * @return array{User, Service}
     */
    private function makeBookableBarber(): array
    {
        $barber = User::factory()->barber()->create();
        $profile = BarberProfile::factory()->create([
            'user_id' => $barber->id,
            'is_published' => true,
        ]);
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

        return [$barber, $service];
    }

    public function test_admin_can_book_open_slot_for_customer(): void
    {
        [$barber, $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();
        $admin = User::factory()->admin()->create();

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->postJson('/api/v1/appointments', [
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'starts_at' => '2026-05-11T09:00:00',
                'customer_user_id' => $customer->id,
                'notes' => 'Booked by desk',
            ])
            ->assertCreated()
            ->assertJsonPath('customer.id', $customer->id)
            ->assertJsonPath('barber.id', $barber->id);

        $this->assertDatabaseHas('appointments', [
            'customer_user_id' => $customer->id,
            'barber_user_id' => $barber->id,
        ]);
    }

    public function test_barber_can_book_open_slot_for_customer(): void
    {
        [$barber, $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();

        $this->withToken($barber->createToken('t')->plainTextToken)
            ->postJson('/api/v1/appointments', [
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'starts_at' => '2026-05-11T09:00:00',
                'customer_user_id' => $customer->id,
            ])
            ->assertCreated()
            ->assertJsonPath('customer.id', $customer->id);
    }

    public function test_staff_booking_requires_customer_user_id(): void
    {
        [$barber, $service] = $this->makeBookableBarber();
        $admin = User::factory()->admin()->create();

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->postJson('/api/v1/appointments', [
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'starts_at' => '2026-05-11T09:00:00',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['customer_user_id']);
    }

    public function test_customer_cannot_send_customer_user_id(): void
    {
        [$barber, $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();
        $other = User::factory()->create();

        $this->withToken($customer->createToken('t')->plainTextToken)
            ->postJson('/api/v1/appointments', [
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'starts_at' => '2026-05-11T09:00:00',
                'customer_user_id' => $other->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['customer_user_id']);

        $this->assertSame(
            0,
            Appointment::query()->count(),
        );
    }

    public function test_staff_customer_search_forbidden_for_customer_role(): void
    {
        $customer = User::factory()->create();

        $this->withToken($customer->createToken('t')->plainTextToken)
            ->getJson('/api/v1/staff/customers/search?q=te')
            ->assertForbidden();
    }

    public function test_staff_customer_search_returns_matches(): void
    {
        User::factory()->create([
            'name' => 'Zara Uniquecustomer',
            'email' => 'zara.booking.test@example.test',
        ]);
        $admin = User::factory()->admin()->create();

        $response = $this->withToken($admin->createToken('t')->plainTextToken)
            ->getJson('/api/v1/staff/customers/search?q=zara');

        $response->assertOk()
            ->assertJsonPath('data.0.email', 'zara.booking.test@example.test');
    }
}
