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
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class AbuseProtectionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(CarbonImmutable::create(2026, 5, 10, 6, 0, 0));
        config()->set('abuse.enabled', true);
        config()->set('abuse.booking.max_future_confirmed', 3);
        config()->set('abuse.booking.max_per_hour', 3);
        config()->set('abuse.cancel.serial_pattern_cancels', 3);
        config()->set('abuse.cancel.serial_pattern_bookings', 3);
        config()->set('abuse.messaging.duplicate_body_cooldown_seconds', 60);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /**
     * @return array{User, Service}
     */
    private function makeBookableBarber(): array
    {
        $barber = User::factory()->barber()->create();
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
            'deposit_cents' => 0,
        ]);

        return [$barber, $service];
    }

    public function test_customer_blocked_when_too_many_future_bookings(): void
    {
        [$barber, $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();

        foreach (
            [
                ['09:00:00', '09:30:00'],
                ['09:30:00', '10:00:00'],
                ['10:00:00', '10:30:00'],
            ] as [$start, $end]
        ) {
            Appointment::query()->create([
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'customer_user_id' => $customer->id,
                'starts_at' => "2026-05-11 {$start}",
                'ends_at' => "2026-05-11 {$end}",
                'status' => Appointment::STATUS_CONFIRMED,
            ]);
        }

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/appointments', [
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'starts_at' => '2026-05-11T10:30:00',
            ]);

        $response->assertStatus(429)
            ->assertJsonPath('code', 'booking_future_limit');
    }

    public function test_staff_booking_bypasses_future_limit(): void
    {
        [$barber, $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();
        $admin = User::factory()->admin()->create();

        foreach (
            [
                ['09:00:00', '09:30:00'],
                ['09:30:00', '10:00:00'],
                ['10:00:00', '10:30:00'],
            ] as [$start, $end]
        ) {
            Appointment::query()->create([
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'customer_user_id' => $customer->id,
                'starts_at' => "2026-05-11 {$start}",
                'ends_at' => "2026-05-11 {$end}",
                'status' => Appointment::STATUS_CONFIRMED,
            ]);
        }

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/appointments', [
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'starts_at' => '2026-05-11T10:30:00',
                'customer_user_id' => $customer->id,
            ])
            ->assertCreated();
    }

    public function test_booking_hourly_rate_limit(): void
    {
        [$barber, $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();

        Cache::put("abuse:bookings:hour:{$customer->id}", 4, now()->addHour());

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/appointments', [
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'starts_at' => '2026-05-11T09:00:00',
            ])
            ->assertStatus(429)
            ->assertJsonPath('code', 'booking_rate_limit');
    }

    public function test_duplicate_thread_note_is_blocked(): void
    {
        $barber = User::factory()->barber()->create();
        $service = Service::factory()->create();
        $customer = User::factory()->create();
        $appt = Appointment::factory()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-06-12 10:00:00',
            'ends_at' => '2026-06-12 10:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $payload = ['kind' => 'note', 'body' => 'Outside now, walking over'];

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/messages", $payload)
            ->assertCreated();

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/messages", $payload)
            ->assertStatus(429)
            ->assertJsonPath('code', 'duplicate_message');
    }

    public function test_serial_cancel_pattern_blocks_customer(): void
    {
        [$barber, $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();

        Cache::put("abuse:bookings:window:{$customer->id}", 4, now()->addDay());

        foreach (
            [
                ['09:00:00', '09:30:00'],
                ['09:30:00', '10:00:00'],
                ['10:00:00', '10:30:00'],
                ['10:30:00', '11:00:00'],
            ] as [$start, $end]
        ) {
            Appointment::query()->create([
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'customer_user_id' => $customer->id,
                'starts_at' => "2026-05-11 {$start}",
                'ends_at' => "2026-05-11 {$end}",
                'status' => Appointment::STATUS_CANCELLED,
                'updated_at' => now(),
            ]);
        }

        $active = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-11 10:30:00',
            'ends_at' => '2026-05-11 11:00:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->patchJson("/api/v1/appointments/{$active->id}/cancel")
            ->assertStatus(429)
            ->assertJsonPath('code', 'cancel_abuse_pattern');
    }

    public function test_unpaid_deposit_hoarding_blocked(): void
    {
        config()->set('abuse.booking.max_unpaid_deposits', 2);
        config()->set('abuse.booking.max_future_confirmed', 10);

        [$barber, $service] = $this->makeBookableBarber();
        $service->update(['deposit_cents' => 500]);
        $customer = User::factory()->create();

        foreach (
            [
                ['09:00:00', '09:30:00'],
                ['09:30:00', '10:00:00'],
            ] as [$start, $end]
        ) {
            Appointment::query()->create([
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'customer_user_id' => $customer->id,
                'starts_at' => "2026-05-11 {$start}",
                'ends_at' => "2026-05-11 {$end}",
                'status' => Appointment::STATUS_CONFIRMED,
                'payment_status' => Appointment::PAYMENT_REQUIRES_PAYMENT,
                'deposit_cents' => 500,
            ]);
        }

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/appointments', [
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'starts_at' => '2026-05-11T10:00:00',
            ])
            ->assertStatus(429)
            ->assertJsonPath('code', 'unpaid_deposit_limit');
    }

    public function test_suspicious_signals_detect_elevated_activity(): void
    {
        [$barber, $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();

        Cache::put("abuse:bookings:window:{$customer->id}", 5, now()->addDay());

        foreach (
            [
                ['09:00:00', '09:30:00'],
                ['09:30:00', '10:00:00'],
                ['10:00:00', '10:30:00'],
                ['10:30:00', '11:00:00'],
            ] as [$start, $end]
        ) {
            Appointment::query()->create([
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'customer_user_id' => $customer->id,
                'starts_at' => "2026-05-04 {$start}",
                'ends_at' => "2026-05-04 {$end}",
                'status' => Appointment::STATUS_CANCELLED,
                'updated_at' => now(),
            ]);
        }

        $signals = app(\App\Services\Abuse\AbuseProtectionService::class)
            ->suspiciousSignalsFor($customer);

        $codes = array_column($signals, 'code');
        $this->assertContains('elevated_cancel_ratio', $codes);
    }
}
