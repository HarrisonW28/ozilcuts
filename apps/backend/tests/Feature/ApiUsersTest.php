<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiUsersTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_index_requires_authentication(): void
    {
        $this->getJson('/api/v1/users')->assertUnauthorized();
    }

    public function test_users_index_forbidden_for_non_admin(): void
    {
        $user = User::factory()->create();

        $this->withToken($user->createToken('t')->plainTextToken)
            ->getJson('/api/v1/users')
            ->assertForbidden();
    }

    public function test_users_index_ok_for_admin(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->count(2)->create();

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->getJson('/api/v1/users')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'email',
                        'email_verified_at',
                        'role' => ['id', 'slug', 'name'],
                    ],
                ],
                'links',
                'meta',
            ]);
    }

    public function test_user_show_requires_authentication(): void
    {
        $user = User::factory()->create();

        $this->getJson("/api/v1/users/{$user->id}")->assertUnauthorized();
    }

    public function test_user_show_forbidden_when_viewing_other_as_customer(): void
    {
        $viewer = User::factory()->create();
        $other = User::factory()->create();

        $this->withToken($viewer->createToken('t')->plainTextToken)
            ->getJson("/api/v1/users/{$other->id}")
            ->assertForbidden();
    }

    public function test_user_show_ok_when_viewing_self(): void
    {
        $user = User::factory()->create();

        $this->withToken($user->createToken('t')->plainTextToken)
            ->getJson("/api/v1/users/{$user->id}")
            ->assertOk()
            ->assertJsonPath('id', $user->id)
            ->assertJsonPath('role.slug', 'customer');
    }

    public function test_user_show_ok_for_admin_viewing_any_user(): void
    {
        $admin = User::factory()->admin()->create();
        $other = User::factory()->create();

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->getJson("/api/v1/users/{$other->id}")
            ->assertOk()
            ->assertJsonPath('id', $other->id);
    }
}
