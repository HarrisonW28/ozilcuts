<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class RevenueReportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(CarbonImmutable::create(2026, 6, 15, 12, 0, 0));
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
        ?int $depositCents = null,
        ?string $refundedAt = null,
        string $paymentStatus = Appointment::PAYMENT_NOT_REQUIRED,
    ): Appointment {
        return Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'status' => $status,
            'deposit_cents' => $depositCents ?? 0,
            'amount_paid_cents' => $amountPaidCents ?? 0,
            'paid_at' => $paidAt,
            'refunded_at' => $refundedAt,
            'payment_status' => $paymentStatus,
        ]);
    }

    public function test_requires_authentication(): void
    {
        $this->getJson('/api/v1/admin/reports/revenue?from=2026-06-01&to=2026-06-30')
            ->assertUnauthorized();
    }

    public function test_forbidden_for_non_admin_users(): void
    {
        $customer = User::factory()->create();
        $barber = User::factory()->barber()->create();

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/admin/reports/revenue?from=2026-06-01&to=2026-06-30')
            ->assertForbidden();

        $this->actingAs($barber, 'sanctum')
            ->getJson('/api/v1/admin/reports/revenue?from=2026-06-01&to=2026-06-30')
            ->assertForbidden();
    }

    public function test_validates_required_dates_and_range(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/revenue')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['from', 'to']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/revenue?from=bad&to=2026-06-30')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['from']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/revenue?from=2026-06-30&to=2026-06-01')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['to']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/revenue?from=2024-01-01&to=2026-06-30')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['to']);
    }

    public function test_summary_includes_booked_collected_refunded_and_net(): void
    {
        $admin = User::factory()->admin()->create();
        $barber = User::factory()->barber()->create();
        $customer = User::factory()->create();
        $service = Service::factory()->create([
            'price_cents' => 5000,
            'duration_minutes' => 30,
        ]);

        // In-period booked + paid
        $this->appt(
            $barber,
            $service,
            $customer,
            '2026-06-05 09:00:00',
            '2026-06-05 09:30:00',
            amountPaidCents: 1000,
            paidAt: '2026-06-05 08:30:00',
            depositCents: 1000,
            paymentStatus: Appointment::PAYMENT_PAID,
        );
        // In-period booked, not paid
        $this->appt(
            $barber,
            $service,
            $customer,
            '2026-06-10 09:00:00',
            '2026-06-10 09:30:00',
        );
        // In-period paid + refunded later in period (booked because confirmed)
        $this->appt(
            $barber,
            $service,
            $customer,
            '2026-06-12 09:00:00',
            '2026-06-12 09:30:00',
            status: Appointment::STATUS_CANCELLED,
            amountPaidCents: 1000,
            paidAt: '2026-06-11 12:00:00',
            depositCents: 1000,
            refundedAt: '2026-06-13 12:00:00',
            paymentStatus: Appointment::PAYMENT_REFUNDED,
        );
        // Out-of-period booked
        $this->appt(
            $barber,
            $service,
            $customer,
            '2026-07-05 09:00:00',
            '2026-07-05 09:30:00',
        );
        // Cancelled in-period (excluded from booked, no payment)
        $this->appt(
            $barber,
            $service,
            $customer,
            '2026-06-20 09:00:00',
            '2026-06-20 09:30:00',
            status: Appointment::STATUS_CANCELLED,
        );

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/revenue?from=2026-06-01&to=2026-06-30')
            ->assertOk()
            ->assertJsonPath('summary.from', '2026-06-01')
            ->assertJsonPath('summary.to', '2026-06-30')
            ->assertJsonPath('summary.booked_cents', 10000)
            ->assertJsonPath('summary.booked_appointments', 2)
            ->assertJsonPath('summary.collected_cents', 2000)
            ->assertJsonPath('summary.paid_appointments', 2)
            ->assertJsonPath('summary.refunded_cents', 1000)
            ->assertJsonPath('summary.net_collected_cents', 1000);
    }

    public function test_breakdowns_group_by_barber_and_service(): void
    {
        $admin = User::factory()->admin()->create();
        $barberA = User::factory()->barber()->create(['name' => 'Avery']);
        $barberB = User::factory()->barber()->create(['name' => 'Blair']);
        $customer = User::factory()->create();
        $cut = Service::factory()->create(['name' => 'Cut', 'price_cents' => 5000]);
        $beard = Service::factory()->create(['name' => 'Beard', 'price_cents' => 3000]);

        $this->appt(
            $barberA,
            $cut,
            $customer,
            '2026-06-02 09:00:00',
            '2026-06-02 09:30:00',
            amountPaidCents: 1000,
            paidAt: '2026-06-02 08:00:00',
            depositCents: 1000,
            paymentStatus: Appointment::PAYMENT_PAID,
        );
        $this->appt(
            $barberA,
            $cut,
            $customer,
            '2026-06-09 09:00:00',
            '2026-06-09 09:30:00',
        );
        $this->appt(
            $barberB,
            $beard,
            $customer,
            '2026-06-04 09:00:00',
            '2026-06-04 09:30:00',
            amountPaidCents: 500,
            paidAt: '2026-06-04 08:00:00',
            depositCents: 500,
            paymentStatus: Appointment::PAYMENT_PAID,
        );

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/revenue?from=2026-06-01&to=2026-06-30')
            ->assertOk()
            ->json();

        $byBarber = collect($response['by_barber'])->keyBy('barber_user_id');
        $this->assertSame(10000, $byBarber[$barberA->id]['booked_cents']);
        $this->assertSame(2, $byBarber[$barberA->id]['booked_appointments']);
        $this->assertSame(1000, $byBarber[$barberA->id]['collected_cents']);
        $this->assertSame(3000, $byBarber[$barberB->id]['booked_cents']);
        $this->assertSame(500, $byBarber[$barberB->id]['collected_cents']);

        $byService = collect($response['by_service'])->keyBy('service_id');
        $this->assertSame(10000, $byService[$cut->id]['booked_cents']);
        $this->assertSame(2, $byService[$cut->id]['booked_appointments']);
        $this->assertSame(3000, $byService[$beard->id]['booked_cents']);
    }

    public function test_series_returns_dense_buckets_with_zeroes(): void
    {
        $admin = User::factory()->admin()->create();
        $barber = User::factory()->barber()->create();
        $customer = User::factory()->create();
        $service = Service::factory()->create(['price_cents' => 4000]);

        $this->appt(
            $barber,
            $service,
            $customer,
            '2026-06-02 10:00:00',
            '2026-06-02 10:30:00',
            amountPaidCents: 800,
            paidAt: '2026-06-02 09:00:00',
            depositCents: 800,
            paymentStatus: Appointment::PAYMENT_PAID,
        );

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/revenue?from=2026-06-01&to=2026-06-03&granularity=day')
            ->assertOk()
            ->assertJsonPath('granularity', 'day')
            ->json();

        $series = collect($response['series'])->keyBy('bucket');
        $this->assertCount(3, $series);
        $this->assertSame(0, $series['2026-06-01']['booked_cents']);
        $this->assertSame(4000, $series['2026-06-02']['booked_cents']);
        $this->assertSame(800, $series['2026-06-02']['collected_cents']);
        $this->assertSame(0, $series['2026-06-03']['booked_cents']);
    }

    public function test_series_supports_monthly_granularity(): void
    {
        $admin = User::factory()->admin()->create();
        $barber = User::factory()->barber()->create();
        $customer = User::factory()->create();
        $service = Service::factory()->create(['price_cents' => 4000]);

        $this->appt($barber, $service, $customer, '2026-04-10 09:00:00', '2026-04-10 09:30:00');
        $this->appt($barber, $service, $customer, '2026-05-15 09:00:00', '2026-05-15 09:30:00');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/revenue?from=2026-04-01&to=2026-06-30&granularity=month')
            ->assertOk()
            ->assertJsonPath('granularity', 'month')
            ->json();

        $series = collect($response['series'])->keyBy('bucket');
        $this->assertSame(['2026-04', '2026-05', '2026-06'], array_keys($series->all()));
        $this->assertSame(4000, $series['2026-04']['booked_cents']);
        $this->assertSame(4000, $series['2026-05']['booked_cents']);
        $this->assertSame(0, $series['2026-06']['booked_cents']);
    }

    public function test_csv_endpoint_streams_admin_only_download(): void
    {
        $admin = User::factory()->admin()->create();
        $customer = User::factory()->create();

        $this->actingAs($customer, 'sanctum')
            ->get('/api/v1/admin/reports/revenue.csv?from=2026-06-01&to=2026-06-30')
            ->assertForbidden();

        $barber = User::factory()->barber()->create(['name' => 'Avery']);
        $service = Service::factory()->create(['name' => 'Cut', 'price_cents' => 5000]);
        $this->appt(
            $barber,
            $service,
            $customer,
            '2026-06-05 09:00:00',
            '2026-06-05 09:30:00',
            amountPaidCents: 1000,
            paidAt: '2026-06-05 08:00:00',
            depositCents: 1000,
            paymentStatus: Appointment::PAYMENT_PAID,
        );

        $res = $this->actingAs($admin, 'sanctum')
            ->get('/api/v1/admin/reports/revenue.csv?from=2026-06-01&to=2026-06-30');

        $res->assertOk();
        $this->assertStringContainsString('text/csv', (string) $res->headers->get('Content-Type'));
        $this->assertStringContainsString('revenue_2026-06-01_2026-06-30.csv', (string) $res->headers->get('Content-Disposition'));
        $body = $res->streamedContent();
        $this->assertStringContainsString('booked_cents,5000', $body);
        $this->assertStringContainsString('collected_cents,1000', $body);
        $this->assertStringContainsString('Avery', $body);
        $this->assertStringContainsString('Cut', $body);
    }
}
