<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class OperationalInsightsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Wednesday, 12:00 — gives same-day cancels and bookings room.
        Carbon::setTestNow(CarbonImmutable::create(2026, 6, 3, 12, 0, 0));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function appt(
        User $barber,
        Service $service,
        User $customer,
        string $startsAt,
        string $endsAt,
        array $overrides = [],
    ): Appointment {
        $defaults = [
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'status' => Appointment::STATUS_CONFIRMED,
            'deposit_cents' => 0,
            'amount_paid_cents' => 0,
            'paid_at' => null,
            'refunded_at' => null,
            'payment_status' => Appointment::PAYMENT_NOT_REQUIRED,
        ];
        $row = array_merge($defaults, $overrides);
        $appt = Appointment::query()->create($row);
        if (isset($overrides['created_at']) || isset($overrides['updated_at'])) {
            $appt->forceFill([
                'created_at' => $overrides['created_at'] ?? $appt->created_at,
                'updated_at' => $overrides['updated_at'] ?? $appt->updated_at,
            ])->save();
        }

        return $appt;
    }

    public function test_operations_endpoint_requires_admin(): void
    {
        $customer = User::factory()->create();
        $barber = User::factory()->barber()->create();

        $this->getJson('/api/v1/admin/reports/operations?from=2026-05-01&to=2026-06-30')
            ->assertUnauthorized();

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/admin/reports/operations?from=2026-05-01&to=2026-06-30')
            ->assertForbidden();

        $this->actingAs($barber, 'sanctum')
            ->getJson('/api/v1/admin/reports/operations?from=2026-05-01&to=2026-06-30')
            ->assertForbidden();
    }

    public function test_operations_endpoint_validates_dates(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/operations')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['from', 'to']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/operations?from=2026-06-30&to=2026-05-01')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['to']);
    }

    public function test_today_block_counts_and_deposits(): void
    {
        $admin = User::factory()->admin()->create();
        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create([
            'duration_minutes' => 30,
            'price_cents' => 5000,
        ]);
        $cust = User::factory()->create();

        // Today: 1 confirmed paid (deposit 1000 collected), 1 confirmed pending (1500 expected), 1 cancelled.
        $this->appt($barber, $service, $cust, '2026-06-03 09:00:00', '2026-06-03 09:30:00', [
            'deposit_cents' => 1000,
            'amount_paid_cents' => 1000,
            'paid_at' => '2026-06-03 08:00:00',
            'payment_status' => Appointment::PAYMENT_PAID,
        ]);
        $this->appt($barber, $service, $cust, '2026-06-03 10:00:00', '2026-06-03 10:30:00', [
            'deposit_cents' => 1500,
            'payment_status' => Appointment::PAYMENT_REQUIRES_PAYMENT,
        ]);
        $this->appt($barber, $service, $cust, '2026-06-03 11:00:00', '2026-06-03 11:30:00', [
            'status' => Appointment::STATUS_CANCELLED,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/operations?from=2026-05-01&to=2026-06-30')
            ->assertOk()
            ->json();

        $this->assertSame('2026-06-03', $response['today']['date']);
        $this->assertSame(2, $response['today']['confirmed']);
        $this->assertSame(1, $response['today']['cancelled']);
        $this->assertSame(1000, $response['today']['deposits_collected_cents']);
        $this->assertSame(1500, $response['today']['deposits_pending_cents']);
    }

    public function test_week_block_includes_next_six_days(): void
    {
        $admin = User::factory()->admin()->create();
        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create([
            'duration_minutes' => 30,
            'price_cents' => 5000,
        ]);
        $cust = User::factory()->create();

        // In window: today + 6 days. Outside: 7 days from now.
        $this->appt($barber, $service, $cust, '2026-06-03 09:00:00', '2026-06-03 09:30:00');
        $this->appt($barber, $service, $cust, '2026-06-09 09:00:00', '2026-06-09 09:30:00');
        $this->appt($barber, $service, $cust, '2026-06-10 09:00:00', '2026-06-10 09:30:00'); // outside
        $this->appt($barber, $service, $cust, '2026-06-04 09:00:00', '2026-06-04 09:30:00', [
            'status' => Appointment::STATUS_CANCELLED,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/operations?from=2026-05-01&to=2026-06-30')
            ->assertOk()
            ->json();

        $this->assertSame('2026-06-03', $response['week']['from']);
        $this->assertSame('2026-06-09', $response['week']['to']);
        $this->assertSame(2, $response['week']['confirmed']);
        $this->assertSame(1, $response['week']['cancelled']);
        $this->assertEqualsWithDelta(1 / 3, $response['week']['cancel_rate'], 0.001);
    }

    public function test_peak_heatmap_is_dense_and_buckets_by_weekday_hour(): void
    {
        $admin = User::factory()->admin()->create();
        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create([
            'duration_minutes' => 30,
            'price_cents' => 5000,
        ]);
        $cust = User::factory()->create();

        // 2026-06-01 = Monday (dayOfWeek=1). Add two confirmed bookings at 09:00 and 09:15.
        $this->appt($barber, $service, $cust, '2026-06-01 09:00:00', '2026-06-01 09:30:00');
        $this->appt($barber, $service, $cust, '2026-06-01 09:15:00', '2026-06-01 09:45:00');
        // 2026-06-02 = Tuesday at 14:00
        $this->appt($barber, $service, $cust, '2026-06-02 14:30:00', '2026-06-02 15:00:00');
        // Cancelled — should not show.
        $this->appt($barber, $service, $cust, '2026-06-01 16:00:00', '2026-06-01 16:30:00', [
            'status' => Appointment::STATUS_CANCELLED,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/operations?from=2026-06-01&to=2026-06-07')
            ->assertOk()
            ->json();

        $this->assertCount(7 * 24, $response['peak_heatmap']);

        $cells = collect($response['peak_heatmap'])
            ->filter(fn ($c) => $c['count'] > 0)
            ->values();
        $this->assertCount(2, $cells);
        $monNine = $cells->first(fn ($c) => $c['weekday'] === 1 && $c['hour'] === 9);
        $tueFourteen = $cells->first(fn ($c) => $c['weekday'] === 2 && $c['hour'] === 14);
        $this->assertNotNull($monNine);
        $this->assertSame(2, $monNine['count']);
        $this->assertSame('Mon', $monNine['weekday_label']);
        $this->assertNotNull($tueFourteen);
        $this->assertSame(1, $tueFourteen['count']);
    }

    public function test_booking_lead_time_buckets(): void
    {
        $admin = User::factory()->admin()->create();
        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create([
            'duration_minutes' => 30,
            'price_cents' => 5000,
        ]);
        $cust = User::factory()->create();

        // Same-day: created 4h before start (in range).
        $this->appt($barber, $service, $cust, '2026-06-05 18:00:00', '2026-06-05 18:30:00', [
            'created_at' => '2026-06-05 14:00:00',
        ]);
        // 1–2 days: created 36h before.
        $this->appt($barber, $service, $cust, '2026-06-06 09:00:00', '2026-06-06 09:30:00', [
            'created_at' => '2026-06-04 21:00:00',
        ]);
        // 8–14 days: created 10 days before.
        $this->appt($barber, $service, $cust, '2026-06-15 09:00:00', '2026-06-15 09:30:00', [
            'created_at' => '2026-06-05 09:00:00',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/operations?from=2026-06-01&to=2026-06-30')
            ->assertOk()
            ->json();

        $by = collect($response['booking_lead_time'])->keyBy('label');
        $this->assertSame(1, $by['Same day']['count']);
        $this->assertSame(1, $by['1–2 days']['count']);
        $this->assertSame(0, $by['3–7 days']['count']);
        $this->assertSame(1, $by['8–14 days']['count']);
        $this->assertSame(0, $by['15–30 days']['count']);
    }

    public function test_cancellation_lead_time_buckets(): void
    {
        $admin = User::factory()->admin()->create();
        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create([
            'duration_minutes' => 30,
            'price_cents' => 5000,
        ]);
        $cust = User::factory()->create();

        // Cancelled <2h before: starts 14:00, updated_at 13:00.
        $this->appt($barber, $service, $cust, '2026-06-05 14:00:00', '2026-06-05 14:30:00', [
            'status' => Appointment::STATUS_CANCELLED,
            'updated_at' => '2026-06-05 13:00:00',
        ]);
        // Cancelled 4 days before: starts 06-15, updated_at 06-11.
        $this->appt($barber, $service, $cust, '2026-06-15 09:00:00', '2026-06-15 09:30:00', [
            'status' => Appointment::STATUS_CANCELLED,
            'updated_at' => '2026-06-11 09:00:00',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/operations?from=2026-06-01&to=2026-06-30')
            ->assertOk()
            ->json();

        $by = collect($response['cancellation_lead_time'])->keyBy('label');
        $this->assertSame(1, $by['<2 hours']['count']);
        $this->assertSame(1, $by['4–7 days']['count']);
    }
}
