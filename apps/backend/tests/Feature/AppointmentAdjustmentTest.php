<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\AppointmentAdjustmentRequest;
use App\Models\BarberAvailabilityWindow;
use App\Models\BarberProfile;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AppointmentAdjustmentTest extends TestCase
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

    private function appt(User $barber, Service $service, User $customer): Appointment
    {
        return Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-11 09:00:00',
            'ends_at' => '2026-05-11 09:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);
    }

    public function test_suggestions_lists_nearby_open_slots(): void
    {
        [$barber, $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();
        $appt = $this->appt($barber, $service, $customer);

        $response = $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/adjustment-suggestions")
            ->assertOk()
            ->json();

        $this->assertNotEmpty($response['suggestions']);
        $this->assertArrayHasKey('starts_at', $response['suggestions'][0]);
        $this->assertArrayHasKey('label', $response['suggestions'][0]);
    }

    public function test_customer_move_request_approved_by_barber_reschedules(): void
    {
        [$barber, $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();
        $appt = $this->appt($barber, $service, $customer);

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/adjustment-request", [
                'starts_at' => '2026-05-11T09:30:00',
            ])
            ->assertCreated()
            ->assertJsonPath('request.status', 'pending')
            ->assertJsonPath('request.can_withdraw', true)
            ->assertJsonPath('request.can_respond', false);

        $pending = $this->actingAs($barber, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/adjustment-request")
            ->assertOk()
            ->json('request');
        $this->assertTrue($pending['can_respond']);

        $this->actingAs($barber, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/adjustment-request/approve")
            ->assertOk()
            ->assertJsonPath('appointment.starts_at', fn ($v) => str_contains((string) $v, '09:30'));

        $appt->refresh();
        $this->assertSame('2026-05-11 09:30:00', $appt->starts_at?->format('Y-m-d H:i:s'));

        $this->assertDatabaseHas('appointment_adjustment_requests', [
            'appointment_id' => $appt->id,
            'status' => AppointmentAdjustmentRequest::STATUS_APPROVED,
        ]);
    }

    public function test_barber_move_request_rejected_by_customer(): void
    {
        [$barber, $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();
        $appt = $this->appt($barber, $service, $customer);

        $this->actingAs($barber, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/adjustment-request", [
                'starts_at' => '2026-05-11T10:00:00',
            ])
            ->assertCreated();

        $this->actingAs($customer, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/adjustment-request/reject")
            ->assertOk()
            ->assertJsonPath('request', null);

        $appt->refresh();
        $this->assertSame('2026-05-11 09:00:00', $appt->starts_at?->format('Y-m-d H:i:s'));
    }

    public function test_conflicting_pending_blocks_other_party(): void
    {
        [$barber, $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();
        $appt = $this->appt($barber, $service, $customer);

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/adjustment-request", [
                'starts_at' => '2026-05-11T09:30:00',
            ])
            ->assertCreated();

        $this->actingAs($barber, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/adjustment-request", [
                'starts_at' => '2026-05-11T10:00:00',
            ])
            ->assertStatus(422);
    }

    public function test_requester_can_withdraw_pending(): void
    {
        [$barber, $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();
        $appt = $this->appt($barber, $service, $customer);

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/adjustment-request", [
                'starts_at' => '2026-05-11T09:30:00',
            ])
            ->assertCreated();

        $this->actingAs($customer, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/adjustment-request/withdraw")
            ->assertOk();

        $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/adjustment-request")
            ->assertOk()
            ->assertJsonPath('request', null);
    }
}
