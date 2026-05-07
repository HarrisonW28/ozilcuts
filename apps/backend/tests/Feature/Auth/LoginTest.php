<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_returns_token_for_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'login@example.com',
            'password' => Hash::make('secret-pass'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'Login@Example.com',
            'password' => 'secret-pass',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.email', 'login@example.com')
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.role.slug', 'customer');

        $this->assertNotEmpty($response->json('token'));
    }

    public function test_login_rejects_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'login@example.com',
            'password' => Hash::make('secret-pass'),
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'login@example.com',
            'password' => 'wrong',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }
}
