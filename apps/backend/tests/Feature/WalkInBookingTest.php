<?php

namespace Tests\Feature;

use App\Mail\AppointmentConfirmedMail;
use App\Models\Appointment;
use App\Models\BarberAvailabilityWindow;
use App\Models\BarberProfile;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class WalkInBookingTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{User, BarberProfile, Service}
     */
    private function makeBookableBarber(): array
    {
        Carbon::setTestNow('2026-05-10 10:00:00');

        $barber = User::factory()->barber()->create();
        $profile = BarberProfile::factory()->create([
            'user_id' => $barber->id,
            'is_published' => true,
        ]);
        BarberAvailabilityWindow::query()->create([
            'barber_profile_id' => $profile->id,
            'weekday' => 1,
            'starts_at' => '09:00:00',
            'ends_at' => '17:00:00',
        ]);
        $service = Service::factory()->create([
            'duration_minutes' => 30,
            'is_active' => true,
            'deposit_cents' => 2000,
        ]);

        return [$barber, $profile, $service];
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_barber_can_log_walk_in_without_online_deposit(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();

        $this->actingAs($barber, 'sanctum')
            ->postJson('/api/v1/appointments/walk-in', [
                'barber_user_id' => $barber->id,
                'service_id' => $service->id,
                'starts_at' => '2026-05-11T09:00:00',
                'walk_in_name' => 'Alex',
            ])
            ->assertCreated()
            ->assertJsonPath('deposit_cents', 0)
            ->assertJsonPath('payment_status', Appointment::PAYMENT_NOT_REQUIRED)
            ->assertJsonPath('notes', 'Walk-in: Alex')
            ->assertJsonPath('payment.client_secret', null);
    }

    public function test_barber_cannot_log_walk_in_for_another_chair(): void
    {
        [$barberA, , $service] = $this->makeBookableBarber();
        $barberB = User::factory()->barber()->create();
        BarberProfile::factory()->create([
            'user_id' => $barberB->id,
            'is_published' => true,
        ]);

        $this->actingAs($barberA, 'sanctum')
            ->postJson('/api/v1/appointments/walk-in', [
                'barber_user_id' => $barberB->id,
                'service_id' => $service->id,
                'starts_at' => '2026-05-11T09:00:00',
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'You can only log walk-ins on your own calendar.');
    }

    public function test_customer_cannot_log_walk_in(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();
        $customer = User::factory()->create();

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/appointments/walk-in', [
                'barber_user_id' => $barber->id,
                'service_id' => $service->id,
                'starts_at' => '2026-05-11T09:00:00',
            ])
            ->assertForbidden();
    }

    public function test_admin_can_log_walk_in_for_any_barber_chair(): void
    {
        [$barber, , $service] = $this->makeBookableBarber();
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/appointments/walk-in', [
                'barber_user_id' => $barber->id,
                'service_id' => $service->id,
                'starts_at' => '2026-05-11T10:30:00',
                'walk_in_name' => 'Sam',
            ])
            ->assertCreated()
            ->assertJsonPath('barber.id', $barber->id)
            ->assertJsonPath('notes', 'Walk-in: Sam');
    }

    public function test_walk_in_does_not_send_customer_confirmation_mail(): void
    {
        Mail::fake();
        [$barber, , $service] = $this->makeBookableBarber();

        $this->actingAs($barber, 'sanctum')
            ->postJson('/api/v1/appointments/walk-in', [
                'barber_user_id' => $barber->id,
                'service_id' => $service->id,
                'starts_at' => '2026-05-11T14:00:00',
                'walk_in_name' => 'Jamie',
            ])
            ->assertCreated();

        Mail::assertNotQueued(AppointmentConfirmedMail::class);
    }
}
