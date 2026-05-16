<?php

namespace Tests\Feature;

use App\Models\CustomerProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class PlatformSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_responses_include_security_headers(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    public function test_customer_cannot_view_staff_relationship_crm(): void
    {
        $customer = User::factory()->create();
        $other = User::factory()->create();
        CustomerProfile::factory()->create(['user_id' => $other->id]);

        $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/customers/{$other->id}/relationship")
            ->assertForbidden();
    }

    public function test_barber_can_view_customer_relationship_crm(): void
    {
        $barber = User::factory()->barber()->create();
        $customer = User::factory()->create();
        CustomerProfile::factory()->create(['user_id' => $customer->id]);

        $this->actingAs($barber, 'sanctum')
            ->getJson("/api/v1/customers/{$customer->id}/relationship")
            ->assertOk();
    }

    public function test_login_is_rate_limited(): void
    {
        RateLimiter::clear('auth');

        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => 'nobody@example.com',
                'password' => 'wrong-password',
            ]);
        }

        $this->postJson('/api/v1/auth/login', [
            'email' => 'nobody@example.com',
            'password' => 'wrong-password',
        ])->assertStatus(429);
    }

    public function test_login_rejects_oversized_password(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'a@b.co',
            'password' => str_repeat('x', 129),
        ])->assertUnprocessable();
    }

    public function test_issued_token_has_expiration(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertOk();

        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_id' => $user->id,
        ]);

        $token = $user->tokens()->first();
        $this->assertNotNull($token?->expires_at);
    }
}
