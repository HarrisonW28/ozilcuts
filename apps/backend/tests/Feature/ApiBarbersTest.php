<?php

namespace Tests\Feature;

use App\Models\BarberProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiBarbersTest extends TestCase
{
    use RefreshDatabase;

    public function test_barbers_index_lists_only_published_barber_role_profiles(): void
    {
        $a = User::factory()->barber()->create(['name' => 'Zed']);
        BarberProfile::factory()->create(['user_id' => $a->id, 'is_published' => true]);

        $b = User::factory()->barber()->create(['name' => 'Amy']);
        BarberProfile::factory()->create(['user_id' => $b->id, 'is_published' => true]);

        BarberProfile::factory()->unpublished()->create([
            'user_id' => User::factory()->barber()->create()->id,
        ]);

        BarberProfile::factory()->create([
            'user_id' => User::factory()->create()->id,
        ]);

        $response = $this->getJson('/api/v1/barbers');

        $response->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.barber.name', 'Amy')
            ->assertJsonPath('data.1.barber.name', 'Zed')
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'title',
                        'bio',
                        'years_experience',
                        'barber' => ['id', 'name'],
                    ],
                ],
            ]);
    }

    public function test_barbers_index_requires_no_authentication(): void
    {
        $user = User::factory()->barber()->create();
        BarberProfile::factory()->create(['user_id' => $user->id]);

        $this->getJson('/api/v1/barbers')->assertOk();
    }

    public function test_barber_show_returns_profile_for_published_barber(): void
    {
        $user = User::factory()->barber()->create(['name' => 'Taylor Cut']);
        BarberProfile::factory()->create([
            'user_id' => $user->id,
            'title' => 'Pro',
            'bio' => 'Hello',
            'is_published' => true,
        ]);

        $this->getJson("/api/v1/barbers/{$user->id}")
            ->assertOk()
            ->assertJsonPath('barber.name', 'Taylor Cut')
            ->assertJsonPath('title', 'Pro');
    }

    public function test_barber_show_returns_404_for_customer(): void
    {
        $user = User::factory()->create();

        $this->getJson("/api/v1/barbers/{$user->id}")->assertNotFound();
    }

    public function test_barber_show_returns_404_for_unpublished_profile(): void
    {
        $user = User::factory()->barber()->create();
        BarberProfile::factory()->unpublished()->create(['user_id' => $user->id]);

        $this->getJson("/api/v1/barbers/{$user->id}")->assertNotFound();
    }
}
