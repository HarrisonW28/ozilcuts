<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BarberAvailabilityWindow;
use App\Models\BarberProfile;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AppointmentQueueIntelligenceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::create(2026, 5, 10, 9, 15, 0, 'UTC'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /**
     * @return array{User, User, Appointment, Appointment}
     */
    private function makeTwoSlotDay(): array
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
        ]);
        $customerA = User::factory()->create();
        $customerB = User::factory()->create();
        $first = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customerA->id,
            'starts_at' => '2026-05-10 09:00:00',
            'ends_at' => '2026-05-10 09:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
            'arrival_state' => Appointment::ARRIVAL_WAITING,
        ]);
        $second = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customerB->id,
            'starts_at' => '2026-05-10 10:00:00',
            'ends_at' => '2026-05-10 10:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
            'arrival_state' => Appointment::ARRIVAL_WAITING,
        ]);

        return [$customerA, $customerB, $first, $second];
    }

    public function test_customer_sees_queue_intelligence_for_own_booking(): void
    {
        [$customerA, $customerB, $first, $second] = $this->makeTwoSlotDay();

        $this->actingAs($customerA, 'sanctum')
            ->getJson("/api/v1/appointments/{$first->id}/queue-intelligence")
            ->assertOk()
            ->assertJsonPath('guests_ahead_in_arrival', 0)
            ->assertJsonPath('is_next_in_line', true);

        $this->actingAs($customerB, 'sanctum')
            ->getJson("/api/v1/appointments/{$second->id}/queue-intelligence")
            ->assertOk()
            ->assertJsonPath('guests_ahead_in_arrival', 1)
            ->assertJsonPath('is_next_in_line', false)
            ->assertJsonPath('queue_date', '2026-05-10')
            ->assertJsonStructure([
                'queue_date',
                'estimated_chair_minutes_ahead',
                'guests_ahead_in_arrival',
                'lounge_guests_other',
                'chair_in_use',
                'visits_behind_schedule',
                'headline',
                'is_next_in_line',
                'pace_tone',
                'updated_at',
            ])
            ->assertJsonPath('pace_tone', 'calm');
    }

    public function test_behind_schedule_uses_behind_pace_tone(): void
    {
        $barber = User::factory()->barber()->create();
        $profile = BarberProfile::factory()->create([
            'user_id' => $barber->id,
            'is_published' => true,
        ]);
        BarberAvailabilityWindow::query()->create([
            'barber_profile_id' => $profile->id,
            'weekday' => 6,
            'starts_at' => '09:00:00',
            'ends_at' => '12:00:00',
        ]);
        $service = Service::factory()->create([
            'duration_minutes' => 30,
            'is_active' => true,
        ]);
        $customer = User::factory()->create();
        $appt = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-05-10 09:00:00',
            'ends_at' => '2026-05-10 09:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
            'arrival_state' => Appointment::ARRIVAL_EXPECTED,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/appointments/{$appt->id}/queue-intelligence")
            ->assertOk()
            ->assertJsonPath('pace_tone', 'behind')
            ->assertJsonPath('visits_behind_schedule', 1);
    }

    public function test_stranger_cannot_view_queue_intelligence(): void
    {
        [, , , $second] = $this->makeTwoSlotDay();
        $stranger = User::factory()->create();

        $this->actingAs($stranger, 'sanctum')
            ->getJson("/api/v1/appointments/{$second->id}/queue-intelligence")
            ->assertForbidden();
    }
}
