<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiUserTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_endpoint_requires_authentication(): void
    {
        $this->getJson('/api/v1/user')->assertUnauthorized();
    }

    public function test_user_endpoint_returns_profile_with_bearer_token(): void
    {
        $user = User::factory()->create();

        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/v1/user')
            ->assertOk()
            ->assertJsonFragment([
                'email' => $user->email,
                'name' => $user->name,
            ])
            ->assertJsonPath('role.slug', 'customer');
    }
}
