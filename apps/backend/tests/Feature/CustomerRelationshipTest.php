<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BarberProfile;
use App\Models\CustomerNote;
use App\Models\CustomerProfile;
use App\Models\CustomerTag;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class CustomerRelationshipTest extends TestCase
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
     * @return array{0: User, 1: Service}
     */
    private function barberAndService(): array
    {
        $barber = User::factory()->barber()->create();
        BarberProfile::factory()->create([
            'user_id' => $barber->id,
            'is_published' => true,
        ]);
        $service = Service::factory()->create([
            'duration_minutes' => 30,
            'is_active' => true,
        ]);

        return [$barber, $service];
    }

    public function test_staff_relationship_requires_authentication(): void
    {
        $customer = User::factory()->create();

        $this->getJson("/api/v1/customers/{$customer->id}/relationship")
            ->assertUnauthorized();
    }

    public function test_staff_relationship_forbidden_for_customer(): void
    {
        $customer = User::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/customers/{$other->id}/relationship")
            ->assertForbidden();
    }

    public function test_barber_can_load_relationship_snapshot(): void
    {
        [$barber, $service] = $this->barberAndService();
        $customer = User::factory()->create();
        CustomerProfile::factory()->create([
            'user_id' => $customer->id,
            'date_of_birth' => '1990-06-20',
        ]);

        Appointment::factory()->create([
            'customer_user_id' => $customer->id,
            'barber_user_id' => $barber->id,
            'service_id' => $service->id,
            'status' => Appointment::STATUS_CONFIRMED,
            'starts_at' => now()->subDays(10),
        ]);

        CustomerNote::factory()->create([
            'customer_user_id' => $customer->id,
            'author_user_id' => $barber->id,
            'body' => 'Prefers a low fade',
            'pinned' => true,
        ]);

        $this->actingAs($barber, 'sanctum')
            ->getJson("/api/v1/customers/{$customer->id}/relationship")
            ->assertOk()
            ->assertJsonPath('data.customer_user_id', $customer->id)
            ->assertJsonPath('data.is_vip', false)
            ->assertJsonPath('data.birthday.has_date', true)
            ->assertJsonPath('data.birthday.is_soon', true)
            ->assertJsonPath('data.visit_summary.total_visits', 1)
            ->assertJsonFragment(['body' => 'Prefers a low fade']);
    }

    public function test_customer_self_relationship(): void
    {
        $customer = User::factory()->create();
        CustomerProfile::factory()->create([
            'user_id' => $customer->id,
            'date_of_birth' => '1995-03-10',
        ]);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/customer/relationship')
            ->assertOk()
            ->assertJsonPath('data.customer_user_id', $customer->id)
            ->assertJsonPath('data.birthday.display', 'March 10');
    }

    public function test_vip_toggle(): void
    {
        [$barber] = $this->barberAndService();
        $customer = User::factory()->create();

        $this->actingAs($barber, 'sanctum')
            ->patchJson("/api/v1/customers/{$customer->id}/relationship/vip", [
                'is_vip' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.is_vip', true);

        $this->assertDatabaseHas('customer_tags', [
            'customer_user_id' => $customer->id,
            'label' => CustomerTag::LABEL_VIP,
        ]);

        $this->actingAs($barber, 'sanctum')
            ->patchJson("/api/v1/customers/{$customer->id}/relationship/vip", [
                'is_vip' => false,
            ])
            ->assertOk()
            ->assertJsonPath('data.is_vip', false);

        $this->assertDatabaseMissing('customer_tags', [
            'customer_user_id' => $customer->id,
            'label' => CustomerTag::LABEL_VIP,
        ]);
    }

    public function test_profile_update_accepts_date_of_birth(): void
    {
        $customer = User::factory()->create();
        CustomerProfile::factory()->create(['user_id' => $customer->id]);

        $this->actingAs($customer, 'sanctum')
            ->patchJson('/api/v1/customer/profile', [
                'date_of_birth' => '1992-08-04',
            ])
            ->assertOk()
            ->assertJsonPath('date_of_birth', '1992-08-04');
    }
}
