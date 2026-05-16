<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\CustomerProfile;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class CustomerPrivacyTest extends TestCase
{
    use RefreshDatabase;

    public function test_privacy_snapshot_requires_customer(): void
    {
        $barber = User::factory()->barber()->create();

        $this->actingAs($barber, 'sanctum')
            ->getJson('/api/v1/customer/privacy')
            ->assertForbidden();
    }

    public function test_customer_can_view_and_update_privacy_controls(): void
    {
        $customer = User::factory()->create([
            'terms_accepted_at' => now(),
            'privacy_policy_accepted_at' => now(),
        ]);
        CustomerProfile::factory()->create([
            'user_id' => $customer->id,
            'marketing_opt_in' => false,
            'arrival_location_opt_in' => false,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/customer/privacy')
            ->assertOk()
            ->assertJsonPath('data.consents.marketing_opt_in', false);

        $this->actingAs($customer, 'sanctum')
            ->patchJson('/api/v1/customer/privacy', [
                'marketing_opt_in' => true,
                'arrival_location_opt_in' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.consents.marketing_opt_in', true)
            ->assertJsonPath('data.consents.arrival_location_opt_in', true);
    }

    public function test_customer_can_export_portable_data(): void
    {
        $customer = User::factory()->create();
        CustomerProfile::factory()->create(['user_id' => $customer->id]);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/customer/privacy/export')
            ->assertOk()
            ->assertJsonPath('format', 'ozilcuts-portable-export-v1')
            ->assertJsonPath('account.email', $customer->email);
    }

    public function test_customer_can_delete_account(): void
    {
        Carbon::setTestNow('2026-06-01 12:00:00');
        $barber = User::factory()->barber()->create();
        $customer = User::factory()->create(['email' => 'gone@example.com']);
        CustomerProfile::factory()->create(['user_id' => $customer->id]);
        $service = Service::factory()->create();

        Appointment::factory()->create([
            'customer_user_id' => $customer->id,
            'barber_user_id' => $barber->id,
            'service_id' => $service->id,
            'status' => Appointment::STATUS_CONFIRMED,
            'starts_at' => now()->addDay(),
        ]);

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/customer/privacy/delete-account', [
                'confirmation' => 'DELETE',
            ])
            ->assertOk();

        $customer->refresh();
        $this->assertStringContainsString('deleted', $customer->email);
        $this->assertSame('Deleted account', $customer->name);
        $this->assertDatabaseMissing('customer_profiles', [
            'user_id' => $customer->id,
        ]);

        Carbon::setTestNow();
    }

    public function test_delete_requires_confirmation_token(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/customer/privacy/delete-account', [
                'confirmation' => 'WRONG',
            ])
            ->assertUnprocessable();
    }
}
