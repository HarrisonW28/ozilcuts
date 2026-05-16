<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegisterTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_creates_user_and_returns_token(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Test User',
            'email' => 'Test@Example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'accept_terms' => true,
            'accept_privacy' => true,
        ]);

        $response->assertCreated()
            ->assertJsonStructure([
                'user' => [
                    'id',
                    'name',
                    'email',
                    'email_verified_at',
                    'role' => ['id', 'slug', 'name'],
                ],
                'token',
            ])
            ->assertJsonPath('user.email', 'test@example.com')
            ->assertJsonPath('user.role.slug', 'customer');

        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
            'name' => 'Test User',
        ]);
        $user = User::query()->where('email', 'test@example.com')->first();
        $this->assertNotNull($user?->terms_accepted_at);
        $this->assertNotNull($user?->privacy_policy_accepted_at);

        $this->assertNotEmpty($response->json('token'));
    }

    public function test_register_rejects_duplicate_email(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Other',
            'email' => 'taken@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'accept_terms' => true,
            'accept_privacy' => true,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }
}
