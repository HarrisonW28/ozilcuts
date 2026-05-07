<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BarberProfile;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class RebookSuggestionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(CarbonImmutable::create(2026, 6, 1, 12, 0, 0));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /**
     * @return array{User, User, Service}
     */
    private function makeBarberAndService(): array
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

        return [$barber, $barber, $service];
    }

    private function createAppt(
        User $barber,
        Service $service,
        User $customer,
        string $start,
        string $end,
        string $status = Appointment::STATUS_CONFIRMED,
    ): Appointment {
        return Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => $start,
            'ends_at' => $end,
            'status' => $status,
        ]);
    }

    public function test_rebook_hint_requires_authentication(): void
    {
        [$barber, , $service] = $this->makeBarberAndService();
        $customer = User::factory()->create();
        $appt = $this->createAppt($barber, $service, $customer, '2026-05-01 09:00:00', '2026-05-01 09:30:00');

        $this->getJson("/api/v1/appointments/{$appt->id}/rebook-hint")
            ->assertUnauthorized();
    }

    public function test_rebook_hint_forbidden_for_unrelated_user(): void
    {
        [$barber, , $service] = $this->makeBarberAndService();
        $customer = User::factory()->create();
        $other = User::factory()->create();
        $appt = $this->createAppt($barber, $service, $customer, '2026-05-01 09:00:00', '2026-05-01 09:30:00');

        $this->actingAs($other, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/rebook-hint")
            ->assertForbidden();
    }

    public function test_rebook_hint_uses_default_interval_with_one_appointment(): void
    {
        [$barber, , $service] = $this->makeBarberAndService();
        $customer = User::factory()->create();
        $appt = $this->createAppt($barber, $service, $customer, '2026-05-01 09:00:00', '2026-05-01 09:30:00');

        $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/rebook-hint")
            ->assertOk()
            ->assertJsonPath('data.service_id', $service->id)
            ->assertJsonPath('data.barber_user_id', $barber->id)
            ->assertJsonPath('data.interval_days', 28)
            ->assertJsonPath('data.sample_size', 1)
            // Source 2026-05-01 + 28d = 2026-05-29, but that's already in the
            // past relative to "now" (2026-06-01), so we clamp forward.
            ->assertJsonPath('data.suggested_date', '2026-06-02')
            ->assertJsonPath('data.service.id', $service->id)
            ->assertJsonPath('data.barber.id', $barber->id);
    }

    public function test_rebook_hint_averages_intervals_from_history(): void
    {
        [$barber, , $service] = $this->makeBarberAndService();
        $customer = User::factory()->create();

        $this->createAppt($barber, $service, $customer, '2026-03-01 09:00:00', '2026-03-01 09:30:00');
        $this->createAppt($barber, $service, $customer, '2026-04-05 09:00:00', '2026-04-05 09:30:00'); // +35
        $this->createAppt($barber, $service, $customer, '2026-05-04 09:00:00', '2026-05-04 09:30:00'); // +29
        $latest = $this->createAppt($barber, $service, $customer, '2026-05-30 09:00:00', '2026-05-30 09:30:00'); // +26

        // (35+29+26)/3 = 30
        $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/appointments/{$latest->id}/rebook-hint")
            ->assertOk()
            ->assertJsonPath('data.interval_days', 30)
            ->assertJsonPath('data.sample_size', 4)
            ->assertJsonPath('data.suggested_date', '2026-06-29');
    }

    public function test_rebook_hint_clamps_suggested_date_to_tomorrow(): void
    {
        [$barber, , $service] = $this->makeBarberAndService();
        $customer = User::factory()->create();

        // Appointment far in the past with default interval still puts the
        // suggestion in the past — clamp to tomorrow.
        $appt = $this->createAppt($barber, $service, $customer, '2024-01-01 09:00:00', '2024-01-01 09:30:00');

        $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/rebook-hint")
            ->assertOk()
            ->assertJsonPath('data.suggested_date', '2026-06-02');
    }

    public function test_rebook_hint_admin_can_view_any_appointment(): void
    {
        [$barber, , $service] = $this->makeBarberAndService();
        $customer = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $appt = $this->createAppt($barber, $service, $customer, '2026-05-01 09:00:00', '2026-05-01 09:30:00');

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/rebook-hint")
            ->assertOk()
            ->assertJsonPath('data.barber_user_id', $barber->id);
    }

    public function test_next_visit_returns_null_when_customer_has_no_past_appointments(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/customer/next-visit')
            ->assertOk()
            ->assertJsonPath('data', null);
    }

    public function test_next_visit_uses_most_recent_past_confirmed_appointment(): void
    {
        [$barber, , $service] = $this->makeBarberAndService();
        $customer = User::factory()->create();

        $this->createAppt($barber, $service, $customer, '2026-04-01 09:00:00', '2026-04-01 09:30:00');
        $this->createAppt($barber, $service, $customer, '2026-05-01 09:00:00', '2026-05-01 09:30:00');
        // Future appointment — should be ignored as "past".
        $this->createAppt($barber, $service, $customer, '2026-07-01 09:00:00', '2026-07-01 09:30:00');

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/customer/next-visit')
            ->assertOk()
            ->assertJsonPath('data.barber_user_id', $barber->id)
            ->assertJsonPath('data.service_id', $service->id)
            ->assertJsonPath('data.interval_days', 30)
            // 2026-05-01 + 30d = 2026-05-31; clamp to tomorrow because that's past.
            ->assertJsonPath('data.suggested_date', '2026-06-02');
    }

    public function test_next_visit_ignores_cancelled_appointments(): void
    {
        [$barber, , $service] = $this->makeBarberAndService();
        $customer = User::factory()->create();

        $this->createAppt(
            $barber,
            $service,
            $customer,
            '2026-05-15 09:00:00',
            '2026-05-15 09:30:00',
            Appointment::STATUS_CANCELLED,
        );

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/customer/next-visit')
            ->assertOk()
            ->assertJsonPath('data', null);
    }

    public function test_next_visit_forbidden_for_non_customer_role(): void
    {
        $barber = User::factory()->barber()->create();

        $this->actingAs($barber, 'sanctum')
            ->getJson('/api/v1/customer/next-visit')
            ->assertForbidden();
    }
}
