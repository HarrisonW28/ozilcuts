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

class BarberAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Pin "now" to a Sunday for stable date math across tests.
        Carbon::setTestNow(CarbonImmutable::create(2026, 6, 14, 12, 0, 0));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /**
     * @return array{User, BarberProfile}
     */
    private function makeBarberWithStandardWeek(): array
    {
        $barber = User::factory()->barber()->create();
        $profile = BarberProfile::factory()->create([
            'user_id' => $barber->id,
            'is_published' => true,
        ]);
        // Mon-Fri 09:00-17:00 = 8 hours/day = 480 min/day, 5 days/week.
        for ($weekday = 1; $weekday <= 5; $weekday++) {
            BarberAvailabilityWindow::query()->create([
                'barber_profile_id' => $profile->id,
                'weekday' => $weekday,
                'starts_at' => '09:00:00',
                'ends_at' => '17:00:00',
            ]);
        }

        return [$barber, $profile];
    }

    private function appt(
        User $barber,
        Service $service,
        User $customer,
        string $startsAt,
        string $endsAt,
        string $status = Appointment::STATUS_CONFIRMED,
        ?int $amountPaidCents = null,
        ?string $paidAt = null,
    ): Appointment {
        return Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'status' => $status,
            'deposit_cents' => 0,
            'amount_paid_cents' => $amountPaidCents ?? 0,
            'paid_at' => $paidAt,
            'refunded_at' => null,
            'payment_status' => $paidAt
                ? Appointment::PAYMENT_PAID
                : Appointment::PAYMENT_NOT_REQUIRED,
        ]);
    }

    public function test_barber_analytics_requires_authentication(): void
    {
        $barber = User::factory()->barber()->create();

        $this->getJson("/api/v1/barbers/{$barber->id}/analytics?from=2026-06-01&to=2026-06-30")
            ->assertUnauthorized();
    }

    public function test_barber_can_view_own_analytics_but_not_others(): void
    {
        [$barberA] = $this->makeBarberWithStandardWeek();
        [$barberB] = $this->makeBarberWithStandardWeek();

        $this->actingAs($barberA, 'sanctum')
            ->getJson("/api/v1/barbers/{$barberA->id}/analytics?from=2026-06-01&to=2026-06-30")
            ->assertOk()
            ->assertJsonPath('summary.barber_user_id', $barberA->id);

        $this->actingAs($barberA, 'sanctum')
            ->getJson("/api/v1/barbers/{$barberB->id}/analytics?from=2026-06-01&to=2026-06-30")
            ->assertForbidden();
    }

    public function test_admin_can_view_any_barber_analytics(): void
    {
        $admin = User::factory()->admin()->create();
        [$barber] = $this->makeBarberWithStandardWeek();

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/v1/barbers/{$barber->id}/analytics?from=2026-06-01&to=2026-06-30")
            ->assertOk()
            ->assertJsonPath('summary.barber_user_id', $barber->id);
    }

    public function test_404_when_user_is_not_a_barber(): void
    {
        $admin = User::factory()->admin()->create();
        $customer = User::factory()->create();

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/v1/barbers/{$customer->id}/analytics?from=2026-06-01&to=2026-06-30")
            ->assertNotFound();
    }

    public function test_validation_errors_on_bad_dates(): void
    {
        [$barber] = $this->makeBarberWithStandardWeek();

        $this->actingAs($barber, 'sanctum')
            ->getJson("/api/v1/barbers/{$barber->id}/analytics")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['from', 'to']);

        $this->actingAs($barber, 'sanctum')
            ->getJson("/api/v1/barbers/{$barber->id}/analytics?from=2026-06-30&to=2026-06-01")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['to']);

        $this->actingAs($barber, 'sanctum')
            ->getJson("/api/v1/barbers/{$barber->id}/analytics?from=2024-01-01&to=2026-06-30")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['to']);
    }

    public function test_summary_aggregates_counts_revenue_and_utilization(): void
    {
        [$barber] = $this->makeBarberWithStandardWeek();
        $cust1 = User::factory()->create();
        $cust2 = User::factory()->create();
        $service = Service::factory()->create([
            'price_cents' => 5000,
            'duration_minutes' => 30,
        ]);

        // Confirmed in-period: 2 from cust1 (repeat), 1 from cust2.
        $this->appt($barber, $service, $cust1, '2026-06-01 09:00:00', '2026-06-01 09:30:00', amountPaidCents: 1000, paidAt: '2026-06-01 08:00:00');
        $this->appt($barber, $service, $cust1, '2026-06-08 09:00:00', '2026-06-08 09:30:00');
        $this->appt($barber, $service, $cust2, '2026-06-02 10:00:00', '2026-06-02 10:30:00');
        // Cancelled in-period
        $this->appt($barber, $service, $cust2, '2026-06-03 10:00:00', '2026-06-03 10:30:00', status: Appointment::STATUS_CANCELLED);
        // Out-of-period
        $this->appt($barber, $service, $cust1, '2026-07-01 09:00:00', '2026-07-01 09:30:00');

        $response = $this->actingAs($barber, 'sanctum')
            ->getJson("/api/v1/barbers/{$barber->id}/analytics?from=2026-06-01&to=2026-06-07")
            ->assertOk()
            ->json();

        $s = $response['summary'];
        // 2026-06-01..2026-06-07 covers Mon, Tue, Wed, Thu, Fri (5 working days).
        // Available = 5 days * 480 min = 2400 min.
        $this->assertSame(2400, $s['available_minutes']);
        // Confirmed in this narrower window: cust1 06-01, cust2 06-02. The
        // 06-08 falls outside the 06-01..06-07 range.
        $this->assertSame(2, $s['appointments_confirmed']);
        $this->assertSame(1, $s['appointments_cancelled']);
        $this->assertSame(3, $s['appointments_total']);
        $this->assertSame(round(1 / 3, 4), $s['cancellation_rate']);
        $this->assertSame(10000, $s['booked_cents']);
        $this->assertSame(60, $s['booked_minutes']);
        $this->assertSame(1000, $s['collected_cents']);
        $this->assertSame(2, $s['customers_total']);
        // Repeat customers within the narrow window: only cust1's 06-01 visit
        // is inside, so no customer reaches 2 visits.
        $this->assertSame(0, $s['repeat_customers']);
        $this->assertSame(round(60 / 2400, 4), $s['utilization_pct']);
    }

    public function test_repeat_customers_counted_when_two_or_more_visits_in_range(): void
    {
        [$barber] = $this->makeBarberWithStandardWeek();
        $cust = User::factory()->create();
        $service = Service::factory()->create(['price_cents' => 4000, 'duration_minutes' => 30]);

        $this->appt($barber, $service, $cust, '2026-06-01 09:00:00', '2026-06-01 09:30:00');
        $this->appt($barber, $service, $cust, '2026-06-08 09:00:00', '2026-06-08 09:30:00');

        $this->actingAs($barber, 'sanctum')
            ->getJson("/api/v1/barbers/{$barber->id}/analytics?from=2026-06-01&to=2026-06-30")
            ->assertOk()
            ->assertJsonPath('summary.customers_total', 1)
            ->assertJsonPath('summary.repeat_customers', 1);
    }

    public function test_top_services_and_top_customers_ranked_by_count(): void
    {
        [$barber] = $this->makeBarberWithStandardWeek();
        $cust1 = User::factory()->create(['name' => 'Cathy']);
        $cust2 = User::factory()->create(['name' => 'Drew']);
        $cut = Service::factory()->create(['name' => 'Cut', 'price_cents' => 5000, 'duration_minutes' => 30]);
        $beard = Service::factory()->create(['name' => 'Beard', 'price_cents' => 3000, 'duration_minutes' => 20]);

        $this->appt($barber, $cut, $cust1, '2026-06-01 09:00:00', '2026-06-01 09:30:00');
        $this->appt($barber, $cut, $cust1, '2026-06-08 09:00:00', '2026-06-08 09:30:00');
        $this->appt($barber, $cut, $cust2, '2026-06-02 10:00:00', '2026-06-02 10:30:00');
        $this->appt($barber, $beard, $cust2, '2026-06-09 10:00:00', '2026-06-09 10:20:00');

        $response = $this->actingAs($barber, 'sanctum')
            ->getJson("/api/v1/barbers/{$barber->id}/analytics?from=2026-06-01&to=2026-06-30")
            ->assertOk()
            ->json();

        $this->assertSame('Cut', $response['top_services'][0]['service_name']);
        $this->assertSame(3, $response['top_services'][0]['count']);
        $this->assertSame('Beard', $response['top_services'][1]['service_name']);
        $this->assertSame(1, $response['top_services'][1]['count']);

        $this->assertSame('Cathy', $response['top_customers'][0]['customer_name']);
        $this->assertSame(2, $response['top_customers'][0]['visits']);
        $this->assertSame('Drew', $response['top_customers'][1]['customer_name']);
        $this->assertSame(2, $response['top_customers'][1]['visits']);
    }

    public function test_series_returns_dense_daily_buckets(): void
    {
        [$barber] = $this->makeBarberWithStandardWeek();
        $cust = User::factory()->create();
        $service = Service::factory()->create(['price_cents' => 4000, 'duration_minutes' => 30]);

        $this->appt($barber, $service, $cust, '2026-06-02 09:00:00', '2026-06-02 09:30:00', amountPaidCents: 800, paidAt: '2026-06-02 08:00:00');

        $response = $this->actingAs($barber, 'sanctum')
            ->getJson("/api/v1/barbers/{$barber->id}/analytics?from=2026-06-01&to=2026-06-03")
            ->assertOk()
            ->json();

        $this->assertCount(3, $response['series']);
        $byBucket = collect($response['series'])->keyBy('bucket');
        $this->assertSame(0, $byBucket['2026-06-01']['appointments_count']);
        $this->assertSame(1, $byBucket['2026-06-02']['appointments_count']);
        $this->assertSame(4000, $byBucket['2026-06-02']['booked_cents']);
        $this->assertSame(800, $byBucket['2026-06-02']['collected_cents']);
        $this->assertSame(0, $byBucket['2026-06-03']['appointments_count']);
    }

    public function test_compare_endpoint_admin_only_and_orders_by_booked_revenue(): void
    {
        $admin = User::factory()->admin()->create();
        [$barberA] = $this->makeBarberWithStandardWeek();
        [$barberB] = $this->makeBarberWithStandardWeek();
        $cust = User::factory()->create();
        $service = Service::factory()->create(['price_cents' => 5000, 'duration_minutes' => 30]);

        // barberB makes more revenue than barberA in-period.
        $this->appt($barberA, $service, $cust, '2026-06-01 09:00:00', '2026-06-01 09:30:00');
        $this->appt($barberB, $service, $cust, '2026-06-01 10:00:00', '2026-06-01 10:30:00');
        $this->appt($barberB, $service, $cust, '2026-06-02 09:00:00', '2026-06-02 09:30:00');

        $this->actingAs($cust, 'sanctum')
            ->getJson('/api/v1/admin/reports/barbers?from=2026-06-01&to=2026-06-30')
            ->assertForbidden();

        $this->actingAs($barberA, 'sanctum')
            ->getJson('/api/v1/admin/reports/barbers?from=2026-06-01&to=2026-06-30')
            ->assertForbidden();

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/barbers?from=2026-06-01&to=2026-06-30')
            ->assertOk()
            ->json();

        $this->assertCount(2, $response['rows']);
        $this->assertSame($barberB->id, $response['rows'][0]['barber_user_id']);
        $this->assertSame(10000, $response['rows'][0]['booked_cents']);
        $this->assertSame($barberA->id, $response['rows'][1]['barber_user_id']);
        $this->assertSame(5000, $response['rows'][1]['booked_cents']);
    }

    public function test_utilization_zero_when_no_availability(): void
    {
        $barber = User::factory()->barber()->create();
        BarberProfile::factory()->create(['user_id' => $barber->id]);
        $cust = User::factory()->create();
        $service = Service::factory()->create(['price_cents' => 5000, 'duration_minutes' => 30]);

        $this->appt($barber, $service, $cust, '2026-06-01 09:00:00', '2026-06-01 09:30:00');

        $this->actingAs($barber, 'sanctum')
            ->getJson("/api/v1/barbers/{$barber->id}/analytics?from=2026-06-01&to=2026-06-07")
            ->assertOk()
            ->assertJsonPath('summary.available_minutes', 0)
            ->assertJsonPath('summary.utilization_pct', 0);
    }
}
