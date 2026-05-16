<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BarberProfile;
use App\Models\CustomerProfile;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class CustomerRetentionSummaryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-06-01 12:00:00');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /**
     * @return array{0: User, 1: Service}
     */
    private function barberAndService(): array
    {
        $barber = User::factory()->barber()->create();
        BarberProfile::factory()->create([
            'user_id' => $barber->id,
            'is_published' => true,
        ]);
        $service = Service::factory()->create([
            'duration_minutes' => 30,
            'is_active' => true,
        ]);

        return [$barber, $service];
    }

    public function test_retention_summary_requires_authentication(): void
    {
        $this->getJson('/api/v1/customer/retention-summary')
            ->assertUnauthorized();
    }

    public function test_retention_summary_forbidden_for_non_customer(): void
    {
        $barber = User::factory()->barber()->create();

        $this->actingAs($barber, 'sanctum')
            ->getJson('/api/v1/customer/retention-summary')
            ->assertForbidden();
    }

    public function test_welcome_nudge_when_no_past_visits(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/customer/retention-summary')
            ->assertOk()
            ->assertJsonPath('data.total_visits', 0)
            ->assertJsonPath('data.rebook', null)
            ->assertJsonPath('data.predicted', null)
            ->assertJsonPath('data.nudge.variant', 'welcome')
            ->assertJsonPath('data.signals.dormant', false);
    }

    public function test_booked_state_and_null_rebook(): void
    {
        [$barber, $service] = $this->barberAndService();
        $customer = User::factory()->create();

        Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-01 09:00:00',
            'ends_at' => '2026-05-01 09:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $upcoming = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-06-10 11:00:00',
            'ends_at' => '2026-06-10 11:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/customer/retention-summary')
            ->assertOk()
            ->assertJsonPath('data.has_upcoming_booking', true)
            ->assertJsonPath('data.rebook', null)
            ->assertJsonPath('data.predicted.source', 'booked')
            ->assertJsonPath('data.predicted.appointment_id', $upcoming->id)
            ->assertJsonPath('data.nudge.variant', 'booked');
    }

    public function test_due_soon_nudge_when_inside_lead_window(): void
    {
        [$barber, $service] = $this->barberAndService();
        $customer = User::factory()->create();

        Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-01 09:00:00',
            'ends_at' => '2026-05-01 09:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/customer/retention-summary')
            ->assertOk()
            ->assertJsonPath('data.signals.due_soon', true)
            ->assertJsonPath('data.signals.dormant', false)
            ->assertJsonPath('data.nudge.variant', 'due_soon');
    }

    public function test_dormant_signal_when_past_inactivity_threshold(): void
    {
        [$barber, $service] = $this->barberAndService();
        $customer = User::factory()->create();

        Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-03-01 09:00:00',
            'ends_at' => '2026-03-01 09:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/customer/retention-summary')
            ->assertOk()
            ->assertJsonPath('data.signals.dormant', true)
            ->assertJsonPath('data.nudge.variant', 'dormant');
    }

    public function test_paused_variant_when_retention_disabled(): void
    {
        [$barber, $service] = $this->barberAndService();
        $customer = User::factory()->create();
        CustomerProfile::factory()->create([
            'user_id' => $customer->id,
            'retention_paused' => true,
        ]);

        Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-01 09:00:00',
            'ends_at' => '2026-05-01 09:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/customer/retention-summary')
            ->assertOk()
            ->assertJsonPath('data.retention_paused', true)
            ->assertJsonPath('data.nudge.variant', 'paused')
            ->assertJsonPath('data.nudge.cta_href', '/profile/notifications');
    }
}
