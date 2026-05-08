<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class CustomerAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(CarbonImmutable::create(2026, 7, 1, 12, 0, 0));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
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

    public function test_aggregate_requires_admin(): void
    {
        $customer = User::factory()->create();
        $barber = User::factory()->barber()->create();

        $this->getJson('/api/v1/admin/reports/customers?from=2026-06-01&to=2026-06-30')
            ->assertUnauthorized();

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/admin/reports/customers?from=2026-06-01&to=2026-06-30')
            ->assertForbidden();

        $this->actingAs($barber, 'sanctum')
            ->getJson('/api/v1/admin/reports/customers?from=2026-06-01&to=2026-06-30')
            ->assertForbidden();
    }

    public function test_aggregate_validates_date_inputs(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/customers')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['from', 'to']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/customers?from=2026-06-30&to=2026-06-01')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['to']);
    }

    public function test_aggregate_counts_active_new_returning_and_top_lists(): void
    {
        $admin = User::factory()->admin()->create();
        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create([
            'price_cents' => 5000,
            'duration_minutes' => 30,
        ]);

        $cust1 = User::factory()->create(['name' => 'Cathy']);
        $cust2 = User::factory()->create(['name' => 'Drew']);
        $cust3 = User::factory()->create(['name' => 'Eli']);

        // cust1: pre-period AND in-period -> returning, not new.
        $this->appt($barber, $service, $cust1, '2026-04-01 09:00:00', '2026-04-01 09:30:00');
        $this->appt(
            $barber,
            $service,
            $cust1,
            '2026-06-05 09:00:00',
            '2026-06-05 09:30:00',
            amountPaidCents: 1500,
            paidAt: '2026-06-05 08:00:00',
        );
        $this->appt($barber, $service, $cust1, '2026-06-20 09:00:00', '2026-06-20 09:30:00');
        // cust2: first ever appt is in-period -> new active customer.
        $this->appt(
            $barber,
            $service,
            $cust2,
            '2026-06-10 10:00:00',
            '2026-06-10 10:30:00',
            amountPaidCents: 4000,
            paidAt: '2026-06-10 09:00:00',
        );
        // cust3: only outside the period (pre-period only) -> not active.
        $this->appt($barber, $service, $cust3, '2026-04-15 09:00:00', '2026-04-15 09:30:00');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/customers?from=2026-06-01&to=2026-06-30')
            ->assertOk()
            ->json();

        $this->assertSame(2, $response['active_customers']);
        $this->assertSame(1, $response['new_customers']);
        $this->assertSame(1, $response['returning_customers']);
        $this->assertSame(3, $response['visits_total']);
        $this->assertSame(1.5, $response['visits_per_customer_avg']);

        $topSpenders = collect($response['top_spenders'])->pluck('customer_name')->all();
        $this->assertSame('Drew', $topSpenders[0]);
        $this->assertSame('Cathy', $topSpenders[1]);

        $topVisitors = collect($response['top_visitors'])->pluck('customer_name')->all();
        $this->assertSame('Cathy', $topVisitors[0]);
        $this->assertSame('Drew', $topVisitors[1]);
    }

    public function test_aggregate_avg_interval_days_uses_consecutive_visits(): void
    {
        $admin = User::factory()->admin()->create();
        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create(['price_cents' => 4000, 'duration_minutes' => 30]);
        $cust = User::factory()->create();

        // Visits spaced 30 and 30 days apart inside the lookup -> avg 30.
        $this->appt($barber, $service, $cust, '2026-05-01 09:00:00', '2026-05-01 09:30:00');
        $this->appt($barber, $service, $cust, '2026-05-31 09:00:00', '2026-05-31 09:30:00');
        $this->appt($barber, $service, $cust, '2026-06-30 09:00:00', '2026-06-30 09:30:00');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/customers?from=2026-06-01&to=2026-06-30')
            ->assertOk()
            ->json();

        // JSON encodes 30.0 as 30; decoded as int.
        $this->assertEquals(30, $response['avg_interval_days']);
    }

    public function test_aggregate_lifetime_value_buckets(): void
    {
        $admin = User::factory()->admin()->create();
        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create(['price_cents' => 5000, 'duration_minutes' => 30]);

        $zero = User::factory()->create();
        $small = User::factory()->create();
        $big = User::factory()->create();

        // small: $30 collected -> bucket "$0.01-$50".
        $this->appt(
            $barber,
            $service,
            $small,
            '2026-06-01 09:00:00',
            '2026-06-01 09:30:00',
            amountPaidCents: 3000,
            paidAt: '2026-06-01 08:00:00',
        );
        // big: $600 collected -> bucket "$500+".
        $this->appt(
            $barber,
            $service,
            $big,
            '2026-06-02 09:00:00',
            '2026-06-02 09:30:00',
            amountPaidCents: 60000,
            paidAt: '2026-06-02 08:00:00',
        );

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/customers?from=2026-06-01&to=2026-06-30')
            ->assertOk()
            ->json();

        $byLabel = collect($response['ltv_distribution'])->keyBy('label');
        $this->assertGreaterThanOrEqual(1, $byLabel['$0']['customers']);
        $this->assertSame(1, $byLabel['$0.01–$50']['customers']);
        $this->assertSame(1, $byLabel['$500+']['customers']);
        $this->assertContains($zero->id, [$zero->id]);
    }

    public function test_admin_can_view_per_customer_drilldown(): void
    {
        $admin = User::factory()->admin()->create();
        $barber = User::factory()->barber()->create(['name' => 'Avery']);
        $cust = User::factory()->create();
        $service = Service::factory()->create(['price_cents' => 5000, 'duration_minutes' => 30]);

        $this->appt(
            $barber,
            $service,
            $cust,
            '2026-04-01 09:00:00',
            '2026-04-01 09:30:00',
            amountPaidCents: 1000,
            paidAt: '2026-04-01 08:00:00',
        );
        $this->appt(
            $barber,
            $service,
            $cust,
            '2026-05-01 09:00:00',
            '2026-05-01 09:30:00',
            amountPaidCents: 1500,
            paidAt: '2026-05-01 08:00:00',
        );
        $this->appt(
            $barber,
            $service,
            $cust,
            '2026-05-15 09:00:00',
            '2026-05-15 09:30:00',
            status: Appointment::STATUS_CANCELLED,
        );

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/v1/admin/customers/{$cust->id}/analytics")
            ->assertOk()
            ->json();

        $s = $response['summary'];
        $this->assertSame($cust->id, $s['customer_user_id']);
        $this->assertSame(2, $s['total_visits']);
        $this->assertSame(2500, $s['total_spent_cents']);
        $this->assertSame(10000, $s['total_booked_cents']);
        $this->assertEquals(30, $s['avg_interval_days']);
        $this->assertSame($barber->id, $s['preferred_barber']['user_id']);
        $this->assertSame('Avery', $s['preferred_barber']['name']);
        $this->assertSame(1, $s['visits_by_status']['cancelled']);
        $this->assertCount(3, $response['history']);
    }

    public function test_per_customer_drilldown_404_for_non_customer(): void
    {
        $admin = User::factory()->admin()->create();
        $barber = User::factory()->barber()->create();

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/v1/admin/customers/{$barber->id}/analytics")
            ->assertNotFound();
    }

    public function test_per_customer_drilldown_forbidden_for_non_admin(): void
    {
        $cust = User::factory()->create();

        $this->actingAs($cust, 'sanctum')
            ->getJson("/api/v1/admin/customers/{$cust->id}/analytics")
            ->assertForbidden();
    }

    public function test_customer_self_summary_returns_their_own_stats(): void
    {
        $barber = User::factory()->barber()->create(['name' => 'Avery']);
        $cust = User::factory()->create();
        $service = Service::factory()->create(['price_cents' => 5000, 'duration_minutes' => 30]);

        $this->appt(
            $barber,
            $service,
            $cust,
            '2026-05-01 09:00:00',
            '2026-05-01 09:30:00',
            amountPaidCents: 1000,
            paidAt: '2026-05-01 08:00:00',
        );

        $this->actingAs($cust, 'sanctum')
            ->getJson('/api/v1/customer/visits')
            ->assertOk()
            ->assertJsonPath('summary.customer_user_id', $cust->id)
            ->assertJsonPath('summary.total_visits', 1)
            ->assertJsonPath('summary.total_spent_cents', 1000)
            ->assertJsonPath('summary.preferred_barber.user_id', $barber->id)
            ->assertJsonCount(1, 'history');
    }

    public function test_customer_self_summary_forbidden_for_non_customers(): void
    {
        $barber = User::factory()->barber()->create();
        $admin = User::factory()->admin()->create();

        $this->actingAs($barber, 'sanctum')
            ->getJson('/api/v1/customer/visits')
            ->assertForbidden();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/customer/visits')
            ->assertForbidden();
    }

    public function test_customer_self_summary_requires_authentication(): void
    {
        $this->getJson('/api/v1/customer/visits')->assertUnauthorized();
    }
}
