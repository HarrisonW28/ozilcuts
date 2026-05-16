<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\AppointmentMessage;
use App\Models\BarberAvailabilityWindow;
use App\Models\BarberProfile;
use App\Models\CustomerProfile;
use App\Models\Notification;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AppointmentArrivalProximityTest extends TestCase
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
     * @return array{User, User, Appointment}
     */
    private function makeAppointmentInArrivalWindow(bool $withShopCoords = true): array
    {
        $barber = User::factory()->barber()->create(
            $withShopCoords
                ? [
                    'shop_latitude' => 51.5074,
                    'shop_longitude' => -0.1278,
                ]
                : [],
        );
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
        CustomerProfile::factory()->create([
            'user_id' => $customer->id,
            'arrival_location_opt_in' => true,
        ]);
        $appt = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-11 09:00:00',
            'ends_at' => '2026-05-11 09:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
            'arrival_state' => Appointment::ARRIVAL_EXPECTED,
        ]);

        return [$customer, $barber, $appt];
    }

    public function test_within_geofence_sends_one_shot_notifications(): void
    {
        [$customer, $barber, $appt] = $this->makeAppointmentInArrivalWindow();

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/arrival-proximity", [
                'lat' => 51.5083,
                'lng' => -0.1278,
            ])
            ->assertOk()
            ->assertJsonPath('within_geofence', true)
            ->assertJsonPath('customer_notified', true)
            ->assertJsonPath('barber_notified', true);

        $this->assertNotNull($appt->fresh()->arrival_nearby_customer_notified_at);
        $this->assertNotNull($appt->fresh()->arrival_nearby_barber_notified_at);

        $this->assertDatabaseCount('notifications', 2);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $customer->id,
            'type' => 'appointment.arrival_nearby',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $barber->id,
            'type' => 'staff.arrival_nearby',
        ]);

        $this->assertSame(1, AppointmentMessage::query()->count());
        $threadLine = AppointmentMessage::query()->first();
        $this->assertNotNull($threadLine);
        $this->assertSame('arrival_auto_guest_near_shop', $threadLine->operational_key);
        $this->assertStringContainsString('Nearby the shop', (string) $threadLine->body);

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/arrival-proximity", [
                'lat' => 51.5083,
                'lng' => -0.1278,
            ])
            ->assertOk()
            ->assertJsonPath('within_geofence', true)
            ->assertJsonPath('customer_notified', false)
            ->assertJsonPath('barber_notified', false);

        $this->assertDatabaseCount('notifications', 2);
        $this->assertSame(1, AppointmentMessage::query()->count());
    }

    public function test_outside_geofence_does_not_notify(): void
    {
        [$customer, , $appt] = $this->makeAppointmentInArrivalWindow();

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/arrival-proximity", [
                'lat' => 52.5,
                'lng' => -1.9,
            ])
            ->assertOk()
            ->assertJsonPath('within_geofence', false)
            ->assertJsonPath('customer_notified', false)
            ->assertJsonPath('barber_notified', false);

        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_opt_out_returns_403(): void
    {
        [$customer, , $appt] = $this->makeAppointmentInArrivalWindow();
        CustomerProfile::query()
            ->where('user_id', $customer->id)
            ->update(['arrival_location_opt_in' => false]);

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/arrival-proximity", [
                'lat' => 51.5083,
                'lng' => -0.1278,
            ])
            ->assertForbidden();

        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_without_shop_coordinates_returns_not_within(): void
    {
        [$customer, , $appt] = $this->makeAppointmentInArrivalWindow(withShopCoords: false);

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/arrival-proximity", [
                'lat' => 51.5083,
                'lng' => -0.1278,
            ])
            ->assertOk()
            ->assertJsonPath('within_geofence', false);

        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_barber_cannot_ping(): void
    {
        [, $barber, $appt] = $this->makeAppointmentInArrivalWindow();

        $this->actingAs($barber, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/arrival-proximity", [
                'lat' => 51.5083,
                'lng' => -0.1278,
            ])
            ->assertForbidden();
    }

    public function test_outside_arrival_window_returns_forbidden(): void
    {
        [$customer, , $appt] = $this->makeAppointmentInArrivalWindow();
        $appt->update([
            'starts_at' => '2026-06-01 09:00:00',
            'ends_at' => '2026-06-01 09:30:00',
        ]);

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/arrival-proximity", [
                'lat' => 51.5083,
                'lng' => -0.1278,
            ])
            ->assertForbidden();

        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_staff_notification_includes_operational_urgency(): void
    {
        [$customer, $barber, $appt] = $this->makeAppointmentInArrivalWindow();

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/arrival-proximity", [
                'lat' => 51.5083,
                'lng' => -0.1278,
            ])
            ->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $barber->id,
            'type' => 'staff.arrival_nearby',
        ]);

        $row = Notification::query()
            ->where('user_id', $barber->id)
            ->where('type', 'staff.arrival_nearby')
            ->first();

        $this->assertNotNull($row);
        $this->assertSame('operational', $row->data['urgency'] ?? null);
        $this->assertStringContainsString('/check-in', (string) ($row->data['deep_link'] ?? ''));
        $this->assertStringContainsString('visit-thread', (string) ($row->data['deep_link'] ?? ''));
    }
}
