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

class AppointmentManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Freeze "now" to a Sunday so weekday math is deterministic.
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
        // Monday 09:00–12:00, plus Tuesday 09:00–12:00 so we can reschedule across days.
        BarberAvailabilityWindow::query()->create([
            'barber_profile_id' => $profile->id,
            'weekday' => 1,
            'starts_at' => '09:00:00',
            'ends_at' => '12:00:00',
        ]);
        BarberAvailabilityWindow::query()->create([
            'barber_profile_id' => $profile->id,
            'weekday' => 2,
            'starts_at' => '09:00:00',
            'ends_at' => '12:00:00',
        ]);

        $service = Service::factory()->create([
            'duration_minutes' => 30,
            'is_active' => true,
        ]);

        return [$barber, $profile, $service];
    }

    private function createConfirmedAppointment(
        User $barber,
        Service $service,
        User $customer,
        string $startsAt = '2026-05-11 09:00:00',
        string $endsAt = '2026-05-11 09:30:00',
    ): Appointment {
        return Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'status' => Appointment::STATUS_CONFIRMED,
        ]);
    }

    public function test_show_returns_appointment_for_participant_only(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();
        $other = User::factory()->create();
        $appt = $this->createConfirmedAppointment($barber, $service, $customer);

        $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}")
            ->assertOk()
            ->assertJsonPath('id', $appt->id);

        $this->actingAs($barber, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}")
            ->assertOk();

        $this->actingAs($other, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}")
            ->assertForbidden();
    }

    public function test_index_filters_by_status_and_range(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();

        // Past confirmed
        $this->createConfirmedAppointment(
            $barber,
            $service,
            $customer,
            '2026-05-04 09:00:00',
            '2026-05-04 09:30:00',
        );
        // Upcoming confirmed
        $this->createConfirmedAppointment(
            $barber,
            $service,
            $customer,
            '2026-05-11 09:00:00',
            '2026-05-11 09:30:00',
        );
        // Upcoming cancelled
        $cancelled = $this->createConfirmedAppointment(
            $barber,
            $service,
            $customer,
            '2026-05-11 10:00:00',
            '2026-05-11 10:30:00',
        );
        $cancelled->update(['status' => Appointment::STATUS_CANCELLED]);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/appointments?range=upcoming&status=confirmed')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.starts_at', '2026-05-11T09:00:00+00:00');

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/appointments?range=past')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.starts_at', '2026-05-04T09:00:00+00:00');

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/appointments?status=cancelled')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', Appointment::STATUS_CANCELLED);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/appointments')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_index_filters_by_from_to_range_for_calendar_view(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();

        // Three appointments straddling the 2026-05-10 .. 2026-05-16 window.
        $this->createConfirmedAppointment(
            $barber,
            $service,
            $customer,
            '2026-05-09 09:00:00',
            '2026-05-09 09:30:00',
        );
        $this->createConfirmedAppointment(
            $barber,
            $service,
            $customer,
            '2026-05-11 09:00:00',
            '2026-05-11 09:30:00',
        );
        $this->createConfirmedAppointment(
            $barber,
            $service,
            $customer,
            '2026-05-16 23:30:00',
            '2026-05-17 00:00:00',
        );
        $this->createConfirmedAppointment(
            $barber,
            $service,
            $customer,
            '2026-05-17 09:00:00',
            '2026-05-17 09:30:00',
        );

        $response = $this->actingAs($barber, 'sanctum')
            ->getJson('/api/v1/appointments?from=2026-05-10&to=2026-05-16')
            ->assertOk()
            ->json();

        $this->assertCount(2, $response['data']);
        // Range queries default to a fat per_page so a calendar week never
        // gets paginated under realistic loads.
        $this->assertSame(200, $response['meta']['per_page']);
        $this->assertSame(
            '2026-05-11T09:00:00+00:00',
            $response['data'][0]['starts_at'],
        );

        $this->actingAs($barber, 'sanctum')
            ->getJson('/api/v1/appointments?from=2026-05-16&to=2026-05-10')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['to']);
    }

    public function test_customer_can_cancel_own_upcoming_appointment(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();
        $appt = $this->createConfirmedAppointment($barber, $service, $customer);

        $this->actingAs($customer, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/cancel")
            ->assertOk()
            ->assertJsonPath('status', Appointment::STATUS_CANCELLED);

        $this->assertDatabaseHas('appointments', [
            'id' => $appt->id,
            'status' => Appointment::STATUS_CANCELLED,
        ]);
    }

    public function test_other_user_cannot_cancel_someone_elses_appointment(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();
        $other = User::factory()->create();
        $appt = $this->createConfirmedAppointment($barber, $service, $customer);

        $this->actingAs($other, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/cancel")
            ->assertForbidden();
    }

    public function test_cannot_cancel_past_appointment_as_participant(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();
        $appt = $this->createConfirmedAppointment(
            $barber,
            $service,
            $customer,
            '2026-05-04 09:00:00',
            '2026-05-04 09:30:00',
        );

        $this->actingAs($customer, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/cancel")
            ->assertForbidden();
    }

    public function test_admin_can_cancel_past_or_cancelled_appointments(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $appt = $this->createConfirmedAppointment(
            $barber,
            $service,
            $customer,
            '2026-05-04 09:00:00',
            '2026-05-04 09:30:00',
        );

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/cancel")
            ->assertOk()
            ->assertJsonPath('status', Appointment::STATUS_CANCELLED);
    }

    public function test_customer_can_reschedule_to_open_slot(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();
        $appt = $this->createConfirmedAppointment($barber, $service, $customer);

        $this->actingAs($customer, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/reschedule", [
                'starts_at' => '2026-05-12T10:00:00',
            ])
            ->assertOk()
            ->assertJsonPath('starts_at', '2026-05-12T10:00:00+00:00')
            ->assertJsonPath('ends_at', '2026-05-12T10:30:00+00:00');

        $this->assertDatabaseHas('appointments', [
            'id' => $appt->id,
            'starts_at' => '2026-05-12 10:00:00',
            'ends_at' => '2026-05-12 10:30:00',
        ]);
    }

    public function test_reschedule_rejects_outside_availability(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();
        $appt = $this->createConfirmedAppointment($barber, $service, $customer);

        $this->actingAs($customer, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/reschedule", [
                'starts_at' => '2026-05-13T09:00:00',
            ])
            ->assertUnprocessable();
    }

    public function test_reschedule_rejects_overlap_with_other_appointment(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();
        $appt = $this->createConfirmedAppointment(
            $barber,
            $service,
            $customer,
            '2026-05-11 09:00:00',
            '2026-05-11 09:30:00',
        );
        $this->createConfirmedAppointment(
            $barber,
            $service,
            User::factory()->create(),
            '2026-05-11 10:00:00',
            '2026-05-11 10:30:00',
        );

        $this->actingAs($customer, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/reschedule", [
                'starts_at' => '2026-05-11T10:00:00',
            ])
            ->assertUnprocessable();
    }

    public function test_reschedule_to_same_time_does_not_self_collide(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();
        $appt = $this->createConfirmedAppointment($barber, $service, $customer);

        $this->actingAs($customer, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/reschedule", [
                'starts_at' => '2026-05-11T09:00:00',
            ])
            ->assertOk()
            ->assertJsonPath('starts_at', '2026-05-11T09:00:00+00:00');
    }

    public function test_cannot_reschedule_cancelled_appointment(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();
        $appt = $this->createConfirmedAppointment($barber, $service, $customer);
        $appt->update(['status' => Appointment::STATUS_CANCELLED]);

        $this->actingAs($customer, 'sanctum')
            ->patchJson("/api/v1/appointments/{$appt->id}/reschedule", [
                'starts_at' => '2026-05-12T10:00:00',
            ])
            ->assertForbidden();
    }

    public function test_slots_endpoint_excludes_appointment_when_requested(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();
        $appt = $this->createConfirmedAppointment($barber, $service, $customer);

        // Without exclusion, 09:00 is taken so 5 slots remain.
        $this->getJson(
            "/api/v1/barbers/{$barber->id}/slots?service_id={$service->id}&date=2026-05-11",
        )->assertOk()->assertJsonCount(5, 'slots');

        // With exclusion, the appointment's own slot becomes selectable.
        $this->getJson(
            "/api/v1/barbers/{$barber->id}/slots?service_id={$service->id}&date=2026-05-11&exclude_appointment_id={$appt->id}",
        )->assertOk()->assertJsonCount(6, 'slots');
    }
}
