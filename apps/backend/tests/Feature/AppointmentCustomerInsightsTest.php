<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\CustomerProfile;
use App\Models\HairProfile;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AppointmentCustomerInsightsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(CarbonImmutable::create(2026, 8, 10, 11, 0, 0));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function makeAppt(
        User $barber,
        Service $service,
        ?User $customer,
        string $startsAt,
        string $endsAt,
    ): Appointment {
        return Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer?->id,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'status' => Appointment::STATUS_CONFIRMED,
            'arrival_state' => Appointment::ARRIVAL_EXPECTED,
            'notes' => null,
            'deposit_cents' => 0,
            'payment_status' => Appointment::PAYMENT_NOT_REQUIRED,
            'amount_paid_cents' => 0,
            'paid_at' => null,
            'refunded_at' => null,
        ]);
    }

    public function test_customer_is_forbidden(): void
    {
        $barber = User::factory()->barber()->create();
        $customer = User::factory()->create();
        $service = Service::factory()->create();
        $appt = $this->makeAppt(
            $barber,
            $service,
            $customer,
            '2026-08-10 14:00:00',
            '2026-08-10 14:30:00',
        );

        $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/customer-insights")
            ->assertForbidden();
    }

    public function test_other_barber_is_forbidden(): void
    {
        $barberA = User::factory()->barber()->create();
        $barberB = User::factory()->barber()->create();
        $customer = User::factory()->create();
        $service = Service::factory()->create();
        $appt = $this->makeAppt(
            $barberA,
            $service,
            $customer,
            '2026-08-10 14:00:00',
            '2026-08-10 14:30:00',
        );

        $this->actingAs($barberB, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/customer-insights")
            ->assertForbidden();
    }

    public function test_assigned_barber_sees_insights(): void
    {
        $barber = User::factory()->barber()->create();
        $customer = User::factory()->create(['name' => 'Jamie']);
        $serviceA = Service::factory()->create(['name' => 'Fade']);
        $serviceB = Service::factory()->create(['name' => 'Beard trim']);

        $this->makeAppt(
            $barber,
            $serviceA,
            $customer,
            '2026-07-01 10:00:00',
            '2026-07-01 10:30:00',
        );
        $this->makeAppt(
            $barber,
            $serviceA,
            $customer,
            '2026-07-15 10:00:00',
            '2026-07-15 10:30:00',
        );

        $current = $this->makeAppt(
            $barber,
            $serviceB,
            $customer,
            '2026-08-10 14:00:00',
            '2026-08-10 14:30:00',
        );

        CustomerProfile::factory()->create([
            'user_id' => $customer->id,
            'preferences' => 'Keep temples soft.',
        ]);

        HairProfile::factory()->create([
            'user_id' => $customer->id,
            'hair_type' => 'wavy',
            'preferred_clipper_guard' => '#2',
            'styling_notes' => 'Low fade, textured top.',
        ]);

        $res = $this->actingAs($barber, 'sanctum')
            ->getJson("/api/v1/appointments/{$current->id}/customer-insights")
            ->assertOk()
            ->json();

        $this->assertTrue($res['linked_customer']);
        $this->assertSame(3, $res['summary']['total_visits']);
        $this->assertSame(3, $res['visits_with_this_barber']);
        $this->assertTrue($res['prefers_you']);
        $this->assertSame('Keep temples soft.', $res['booking_preferences_note']);
        $this->assertSame('wavy', $res['hair_preferences']['hair_type']);
        $this->assertSame('#2', $res['hair_preferences']['preferred_clipper_guard']);
        $this->assertSame('Low fade, textured top.', $res['hair_preferences']['styling_notes']);
        $this->assertSame('returning', $res['recognition_tier']);
        $this->assertCount(2, $res['favorite_services']);
        $this->assertGreaterThanOrEqual(1, count($res['history_preview']));
    }

    public function test_admin_can_load_insights(): void
    {
        $admin = User::factory()->admin()->create();
        $barber = User::factory()->barber()->create();
        $customer = User::factory()->create();
        $service = Service::factory()->create();
        $appt = $this->makeAppt(
            $barber,
            $service,
            $customer,
            '2026-08-10 14:00:00',
            '2026-08-10 14:30:00',
        );

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/customer-insights")
            ->assertOk()
            ->assertJsonPath('linked_customer', true)
            ->assertJsonPath('summary.total_visits', 1);
    }
}
