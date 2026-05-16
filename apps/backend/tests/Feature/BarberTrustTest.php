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

class BarberTrustTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-06-15 12:00:00');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /**
     * @return array{0: User, 1: Service, 2: BarberProfile}
     */
    private function publishedBarber(): array
    {
        $barber = User::factory()->barber()->create();
        $profile = BarberProfile::factory()->create([
            'user_id' => $barber->id,
            'is_published' => true,
            'specialties' => ['Skin fade', 'Beard trim'],
        ]);
        $service = Service::factory()->create(['is_active' => true]);

        return [$barber, $service, $profile];
    }

    public function test_trust_endpoint_returns_404_for_unpublished_barber(): void
    {
        $barber = User::factory()->barber()->create();
        BarberProfile::factory()->create([
            'user_id' => $barber->id,
            'is_published' => false,
        ]);

        $this->getJson("/api/v1/barbers/{$barber->id}/trust")
            ->assertNotFound();
    }

    public function test_trust_includes_repeat_metrics_and_profile_specialties(): void
    {
        [$barber, $service, $profile] = $this->publishedBarber();
        $customer = User::factory()->create();

        foreach (['2026-04-01', '2026-05-01', '2026-05-20'] as $start) {
            Appointment::query()->create([
                'service_id' => $service->id,
                'barber_user_id' => $barber->id,
                'customer_user_id' => $customer->id,
                'starts_at' => "{$start} 10:00:00",
                'ends_at' => "{$start} 10:30:00",
                'status' => Appointment::STATUS_CONFIRMED,
                'arrival_state' => Appointment::ARRIVAL_IN_CHAIR,
            ]);
        }

        BarberAvailabilityWindow::factory()->create([
            'barber_profile_id' => $profile->id,
            'weekday' => 1,
            'starts_at' => '09:00',
            'ends_at' => '17:00',
        ]);

        $this->getJson("/api/v1/barbers/{$barber->id}/trust")
            ->assertOk()
            ->assertJsonPath('data.specialties_source', 'profile')
            ->assertJsonPath('data.specialties.0', 'Skin fade')
            ->assertJsonPath('data.repeat_metrics.verified_visits', 3)
            ->assertJsonPath('data.repeat_metrics.unique_customers', 1)
            ->assertJsonPath('data.repeat_metrics.repeat_customers', 1)
            ->assertJsonFragment(['key' => 'schedule', 'label' => 'Published hours']);
    }

    public function test_customer_can_submit_verified_review_after_visit(): void
    {
        [$barber, $service] = $this->publishedBarber();
        $customer = User::factory()->create();

        $appt = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-06-01 10:00:00',
            'ends_at' => '2026-06-01 10:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/review", [
                'rating' => 5,
                'body' => 'Great fade — exactly what I wanted.',
            ])
            ->assertCreated()
            ->assertJsonPath('data.rating', 5)
            ->assertJsonPath('data.verified', true);

        $this->getJson("/api/v1/barbers/{$barber->id}/trust")
            ->assertOk()
            ->assertJsonPath('data.review_count', 1)
            ->assertJsonPath('data.average_rating', 5)
            ->assertJsonPath('data.reviews.0.body', 'Great fade — exactly what I wanted.');
    }

    public function test_review_rejected_for_future_appointment(): void
    {
        [$barber, $service] = $this->publishedBarber();
        $customer = User::factory()->create();

        $appt = Appointment::query()->create([
            'service_id' => $service->id,
            'barber_user_id' => $barber->id,
            'customer_user_id' => $customer->id,
            'starts_at' => '2026-06-20 10:00:00',
            'ends_at' => '2026-06-20 10:30:00',
            'status' => Appointment::STATUS_CONFIRMED,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/appointments/{$appt->id}/review", [
                'rating' => 5,
                'body' => 'Trying to review early.',
            ])
            ->assertUnprocessable();
    }
}
