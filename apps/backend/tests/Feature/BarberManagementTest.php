<?php

namespace Tests\Feature;

use App\Models\BarberProfile;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class BarberManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_manage_barbers_index_forbidden_for_non_admin(): void
    {
        $user = User::factory()->create();

        $this->withToken($user->createToken('t')->plainTextToken)
            ->getJson('/api/v1/manage/barbers')
            ->assertForbidden();
    }

    public function test_manage_barbers_index_ok_for_admin(): void
    {
        $admin = User::factory()->admin()->create();
        $barber = User::factory()->barber()->create(['name' => 'Listed Barber']);
        BarberProfile::factory()->create(['user_id' => $barber->id]);

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->getJson('/api/v1/manage/barbers')
            ->assertOk()
            ->assertJsonPath('data.0.user.name', 'Listed Barber')
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'title',
                        'bio',
                        'years_experience',
                        'is_published',
                        'user' => ['id', 'name', 'email'],
                        'updated_at',
                    ],
                ],
                'links',
                'meta',
            ]);
    }

    public function test_admin_can_create_barber_with_profile(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->withToken($admin->createToken('t')->plainTextToken)
            ->postJson('/api/v1/manage/barbers', [
                'name' => 'New Barber',
                'email' => 'new-barber@example.com',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'title' => 'Stylist',
                'bio' => 'Great fades.',
                'years_experience' => 4,
                'is_published' => true,
            ]);

        $response->assertCreated()
            ->assertJsonPath('user.email', 'new-barber@example.com')
            ->assertJsonPath('title', 'Stylist');

        $this->assertDatabaseHas('users', [
            'email' => 'new-barber@example.com',
            'name' => 'New Barber',
        ]);

        $user = User::query()->where('email', 'new-barber@example.com')->first();
        $this->assertNotNull($user);
        $this->assertTrue($user->hasRole(Role::SLUG_BARBER));
        $this->assertTrue(Hash::check('password123', $user->password));
    }

    public function test_barber_can_update_own_profile_fields_not_publish_flag(): void
    {
        $barber = User::factory()->barber()->create();
        BarberProfile::factory()->create([
            'user_id' => $barber->id,
            'title' => 'Old',
            'is_published' => true,
        ]);

        $this->withToken($barber->createToken('t')->plainTextToken)
            ->patchJson("/api/v1/manage/barbers/{$barber->id}/profile", [
                'title' => 'Updated title',
                'bio' => 'New bio text',
                'years_experience' => 6,
            ])
            ->assertOk()
            ->assertJsonPath('title', 'Updated title')
            ->assertJsonPath('is_published', true);

        $this->assertDatabaseHas('barber_profiles', [
            'user_id' => $barber->id,
            'title' => 'Updated title',
            'is_published' => true,
        ]);
    }

    public function test_barber_cannot_set_is_published(): void
    {
        $barber = User::factory()->barber()->create();
        BarberProfile::factory()->create(['user_id' => $barber->id, 'is_published' => true]);

        $this->withToken($barber->createToken('t')->plainTextToken)
            ->patchJson("/api/v1/manage/barbers/{$barber->id}/profile", [
                'is_published' => false,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['is_published']);
    }

    public function test_barber_cannot_update_other_barber_profile(): void
    {
        $a = User::factory()->barber()->create();
        BarberProfile::factory()->create(['user_id' => $a->id]);
        $b = User::factory()->barber()->create();
        BarberProfile::factory()->create(['user_id' => $b->id]);

        $this->withToken($a->createToken('t')->plainTextToken)
            ->patchJson("/api/v1/manage/barbers/{$b->id}/profile", ['title' => 'Hacked'])
            ->assertForbidden();
    }

    public function test_admin_can_toggle_is_published(): void
    {
        $admin = User::factory()->admin()->create();
        $barber = User::factory()->barber()->create();
        BarberProfile::factory()->create(['user_id' => $barber->id, 'is_published' => true]);

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->patchJson("/api/v1/manage/barbers/{$barber->id}/profile", [
                'is_published' => false,
            ])
            ->assertOk()
            ->assertJsonPath('is_published', false);
    }

    public function test_update_forbidden_for_non_barber_user(): void
    {
        $admin = User::factory()->admin()->create();
        $customer = User::factory()->create();

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->patchJson("/api/v1/manage/barbers/{$customer->id}/profile", [
                'title' => 'Nope',
            ])
            ->assertForbidden();
    }
}
