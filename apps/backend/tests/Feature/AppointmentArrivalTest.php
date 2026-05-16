<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BarberAvailabilityWindow;
use App\Models\BarberProfile;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AppointmentArrivalTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::create(2026, 5, 10, 12, 0, 0, 'UTC'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /**
     * @return array{User, Service, Appointment}
     */
    private function makeUpcomingAppointment(): array
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
        $customer = User::factory()->create();
        $appt = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-11 09:00:00',
            'ends_at' => '2026-05-11 09:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
            'arrival_state' => Appointment::ARRIVAL_EXPECTED,
        ]);

        return [$customer, $service, $appt];
    }

    public function test_customer_may_check_in_to_arrived(): void
    {
        [$customer, , $appt] = $this->makeUpcomingAppointment();

        $this->actingAs($customer, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/arrival", [
                'arrival_state' => Appointment::ARRIVAL_ARRIVED,
            ])
            ->assertOk()
            ->assertJsonPath('arrival_state', Appointment::ARRIVAL_ARRIVED);

        $this->assertSame(Appointment::ARRIVAL_ARRIVED, $appt->fresh()->arrival_state);

        $thread = $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/messages")
            ->assertOk()
            ->json();
        $this->assertCount(1, $thread['messages']);
        $this->assertSame('operational', $thread['messages'][0]['kind']);
        $this->assertSame(
            'arrival_auto_guest_checked_in',
            $thread['messages'][0]['operational_key'],
        );

        $barber = User::query()->findOrFail($appt->barber_user_id);
        $this->assertNotNull($appt->fresh()->arrival_checked_in_barber_notified_at);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $barber->id,
            'type' => 'staff.arrival_checked_in',
        ]);
    }

    public function test_barber_advances_waiting_then_in_chair(): void
    {
        [$customer, , $appt] = $this->makeUpcomingAppointment();
        $barber = User::query()->findOrFail($appt->barber_user_id);

        $this->actingAs($customer, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/arrival", [
                'arrival_state' => Appointment::ARRIVAL_ARRIVED,
            ])
            ->assertOk();

        $this->actingAs($barber, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/arrival", [
                'arrival_state' => Appointment::ARRIVAL_WAITING,
            ])
            ->assertOk()
            ->assertJsonPath('arrival_state', Appointment::ARRIVAL_WAITING);

        $thread = $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/messages")
            ->assertOk()
            ->json();
        $this->assertCount(2, $thread['messages']);
        $this->assertSame(
            'arrival_auto_shop_queue',
            $thread['messages'][1]['operational_key'],
        );

        $this->actingAs($barber, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/arrival", [
                'arrival_state' => Appointment::ARRIVAL_IN_CHAIR,
            ])
            ->assertOk()
            ->assertJsonPath('arrival_state', Appointment::ARRIVAL_IN_CHAIR);

        $thread = $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/messages")
            ->assertOk()
            ->json();
        $this->assertCount(3, $thread['messages']);
        $this->assertSame(
            'arrival_auto_shop_in_chair',
            $thread['messages'][2]['operational_key'],
        );
    }

    public function test_barber_cannot_skip_waiting(): void
    {
        [$customer, , $appt] = $this->makeUpcomingAppointment();
        $barber = User::query()->findOrFail($appt->barber_user_id);

        $this->actingAs($customer, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/arrival", [
                'arrival_state' => Appointment::ARRIVAL_ARRIVED,
            ])
            ->assertOk();

        $this->actingAs($barber, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/arrival", [
                'arrival_state' => Appointment::ARRIVAL_IN_CHAIR,
            ])
            ->assertForbidden();
    }

    public function test_customer_cannot_move_to_waiting(): void
    {
        [$customer, , $appt] = $this->makeUpcomingAppointment();

        $this->actingAs($customer, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/arrival", [
                'arrival_state' => Appointment::ARRIVAL_WAITING,
            ])
            ->assertForbidden();
    }

    public function test_show_includes_arrival_state(): void
    {
        [$customer, , $appt] = $this->makeUpcomingAppointment();

        $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}")
            ->assertOk()
            ->assertJsonPath('arrival_state', Appointment::ARRIVAL_EXPECTED);
    }
}
