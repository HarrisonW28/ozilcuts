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

class DepositPolicyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(CarbonImmutable::create(2026, 6, 1, 8, 0, 0));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /**
     * @return array{User, BarberProfile}
     */
    private function makeBookableBarber(): array
    {
        $barber = User::factory()->barber()->create();
        /** @var BarberProfile $profile */
        $profile = BarberProfile::factory()->create([
            'user_id' => $barber->id,
            'is_published' => true,
        ]);
        // Cover all weekdays 09:00-18:00.
        for ($w = 0; $w < 7; $w++) {
            BarberAvailabilityWindow::factory()->create([
                'barber_profile_id' => $profile->id,
                'weekday' => $w,
                'starts_at' => '09:00:00',
                'ends_at' => '18:00:00',
            ]);
        }

        return [$barber, $profile];
    }

    public function test_first_time_only_skips_deposit_for_returning_customer(): void
    {
        [$barber] = $this->makeBookableBarber();
        $service = Service::factory()->create([
            'duration_minutes' => 30,
            'price_cents' => 5000,
            'deposit_cents' => 1500,
            'deposit_policy' => Service::DEPOSIT_POLICY_FIRST_TIME_CUSTOMER,
            'is_active' => true,
        ]);
        $cust = User::factory()->create();

        // Existing prior confirmed booking — qualifies as a returning customer.
        Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $cust->id,
            'starts_at' => '2026-05-01 10:00:00',
            'ends_at' => '2026-05-01 10:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
            'deposit_cents' => 1500,
            'amount_paid_cents' => 1500,
            'paid_at' => '2026-05-01 09:00:00',
            'payment_status' => Appointment::PAYMENT_PAID,
        ]);

        $payload = [
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'starts_at' => '2026-06-02T10:00:00',
        ];
        $response = $this->actingAs($cust, 'sanctum')
            ->postJson('/api/v1/appointments', $payload)
            ->assertCreated();

        $this->assertSame(0, $response->json('deposit_cents'));
        $this->assertSame(
            Appointment::PAYMENT_NOT_REQUIRED,
            $response->json('payment_status'),
        );
    }

    public function test_first_time_only_charges_deposit_for_brand_new_customer(): void
    {
        [$barber] = $this->makeBookableBarber();
        $service = Service::factory()->create([
            'duration_minutes' => 30,
            'price_cents' => 5000,
            'deposit_cents' => 1500,
            'deposit_policy' => Service::DEPOSIT_POLICY_FIRST_TIME_CUSTOMER,
            'is_active' => true,
        ]);
        $cust = User::factory()->create();

        $payload = [
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'starts_at' => '2026-06-02T10:00:00',
        ];
        $response = $this->actingAs($cust, 'sanctum')
            ->postJson('/api/v1/appointments', $payload)
            ->assertCreated();

        $this->assertSame(1500, $response->json('deposit_cents'));
        $this->assertSame(
            Appointment::PAYMENT_REQUIRES_PAYMENT,
            $response->json('payment_status'),
        );
    }

    public function test_always_policy_always_charges_deposit(): void
    {
        [$barber] = $this->makeBookableBarber();
        $service = Service::factory()->create([
            'duration_minutes' => 30,
            'price_cents' => 5000,
            'deposit_cents' => 2500,
            'deposit_policy' => Service::DEPOSIT_POLICY_ALWAYS,
            'is_active' => true,
        ]);
        $cust = User::factory()->create();

        // Even with a prior booking, the deposit is collected.
        Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $cust->id,
            'starts_at' => '2026-05-01 10:00:00',
            'ends_at' => '2026-05-01 10:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
            'deposit_cents' => 2500,
            'amount_paid_cents' => 2500,
            'paid_at' => '2026-05-01 09:00:00',
            'payment_status' => Appointment::PAYMENT_PAID,
        ]);

        $payload = [
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'starts_at' => '2026-06-02T10:00:00',
        ];
        $response = $this->actingAs($cust, 'sanctum')
            ->postJson('/api/v1/appointments', $payload)
            ->assertCreated();

        $this->assertSame(2500, $response->json('deposit_cents'));
        $this->assertSame(
            Appointment::PAYMENT_REQUIRES_PAYMENT,
            $response->json('payment_status'),
        );
    }

    public function test_admin_can_set_deposit_policy_via_service_management(): void
    {
        $admin = User::factory()->admin()->create();

        $createResponse = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/manage/services', [
                'name' => 'New Customer Trim',
                'duration_minutes' => 30,
                'price_cents' => 5000,
                'deposit_cents' => 1000,
                'deposit_policy' => Service::DEPOSIT_POLICY_FIRST_TIME_CUSTOMER,
            ])
            ->assertCreated();
        $serviceId = (int) $createResponse->json('id');
        $this->assertSame(
            Service::DEPOSIT_POLICY_FIRST_TIME_CUSTOMER,
            $createResponse->json('deposit_policy'),
        );

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/v1/manage/services/{$serviceId}", [
                'deposit_policy' => Service::DEPOSIT_POLICY_ALWAYS,
            ])
            ->assertOk()
            ->assertJsonPath('deposit_policy', Service::DEPOSIT_POLICY_ALWAYS);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/v1/manage/services/{$serviceId}", [
                'deposit_policy' => 'bogus',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['deposit_policy']);
    }
}
