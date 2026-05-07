<?php

namespace Tests\Feature;

use App\Models\BarberProfile;
use App\Models\CustomerProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_profile_requires_authentication(): void
    {
        $this->getJson('/api/v1/customer/profile')->assertUnauthorized();
        $this->patchJson('/api/v1/customer/profile', [])->assertUnauthorized();
    }

    public function test_customer_profile_is_created_on_first_read(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/customer/profile')
            ->assertOk()
            ->assertJsonPath('user.id', $customer->id)
            ->assertJsonPath('phone', null)
            ->assertJsonPath('marketing_opt_in', false);

        $this->assertDatabaseHas('customer_profiles', [
            'user_id' => $customer->id,
            'marketing_opt_in' => false,
        ]);
    }

    public function test_non_customer_cannot_access_customer_profile(): void
    {
        $barber = User::factory()->barber()->create();

        $this->actingAs($barber, 'sanctum')
            ->getJson('/api/v1/customer/profile')
            ->assertForbidden();

        $this->actingAs($barber, 'sanctum')
            ->patchJson('/api/v1/customer/profile', [
                'phone' => '555-0100',
            ])
            ->assertForbidden();
    }

    public function test_customer_can_update_profile(): void
    {
        $customer = User::factory()->create();
        $barber = User::factory()->barber()->create();
        BarberProfile::factory()->create([
            'user_id' => $barber->id,
            'is_published' => true,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->patchJson('/api/v1/customer/profile', [
                'phone' => '+1 555 0100',
                'preferred_barber_user_id' => $barber->id,
                'preferences' => 'Skin fade every two weeks.',
                'marketing_opt_in' => true,
            ])
            ->assertOk()
            ->assertJsonPath('phone', '+1 555 0100')
            ->assertJsonPath('preferred_barber_user_id', $barber->id)
            ->assertJsonPath('preferred_barber.id', $barber->id)
            ->assertJsonPath('preferences', 'Skin fade every two weeks.')
            ->assertJsonPath('marketing_opt_in', true);

        $this->assertDatabaseHas('customer_profiles', [
            'user_id' => $customer->id,
            'preferred_barber_user_id' => $barber->id,
            'marketing_opt_in' => true,
        ]);
    }

    public function test_preferred_barber_must_be_barber_user(): void
    {
        $customer = User::factory()->create();
        $otherCustomer = User::factory()->create();

        $this->actingAs($customer, 'sanctum')
            ->patchJson('/api/v1/customer/profile', [
                'preferred_barber_user_id' => $otherCustomer->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['preferred_barber_user_id']);
    }

    public function test_profile_update_preserves_existing_fields_when_partial(): void
    {
        $customer = User::factory()->create();
        CustomerProfile::factory()->create([
            'user_id' => $customer->id,
            'phone' => '555-0000',
            'preferences' => 'Keep the top long.',
            'marketing_opt_in' => true,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->patchJson('/api/v1/customer/profile', [
                'phone' => '555-9999',
            ])
            ->assertOk()
            ->assertJsonPath('phone', '555-9999')
            ->assertJsonPath('preferences', 'Keep the top long.')
            ->assertJsonPath('marketing_opt_in', true);
    }
}
