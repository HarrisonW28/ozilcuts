<?php

namespace Tests\Feature;

use App\Models\BarberAvailabilityWindow;
use App\Models\BarberProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BarberAvailabilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_availability_for_published_barber(): void
    {
        $user = User::factory()->barber()->create();
        $profile = BarberProfile::factory()->create(['user_id' => $user->id, 'is_published' => true]);
        BarberAvailabilityWindow::query()->create([
            'barber_profile_id' => $profile->id,
            'weekday' => 1,
            'starts_at' => '09:00:00',
            'ends_at' => '12:00:00',
        ]);

        $this->getJson("/api/v1/barbers/{$user->id}/availability")
            ->assertOk()
            ->assertJsonPath('weekdays.0.weekday', 1)
            ->assertJsonPath('weekdays.0.windows.0.starts_at', '09:00')
            ->assertJsonPath('weekdays.0.windows.0.ends_at', '12:00');
    }

    public function test_public_availability_404_when_unpublished(): void
    {
        $user = User::factory()->barber()->create();
        BarberProfile::factory()->unpublished()->create(['user_id' => $user->id]);

        $this->getJson("/api/v1/barbers/{$user->id}/availability")->assertNotFound();
    }

    public function test_manage_get_ok_for_barber_self(): void
    {
        $user = User::factory()->barber()->create();
        BarberProfile::factory()->create(['user_id' => $user->id]);

        $this->withToken($user->createToken('t')->plainTextToken)
            ->getJson("/api/v1/manage/barbers/{$user->id}/availability")
            ->assertOk()
            ->assertJsonPath('weekdays', []);
    }

    public function test_manage_get_forbidden_for_other_barber(): void
    {
        $a = User::factory()->barber()->create();
        BarberProfile::factory()->create(['user_id' => $a->id]);
        $b = User::factory()->barber()->create();
        BarberProfile::factory()->create(['user_id' => $b->id]);

        $this->withToken($b->createToken('t')->plainTextToken)
            ->getJson("/api/v1/manage/barbers/{$a->id}/availability")
            ->assertForbidden();
    }

    public function test_manage_put_replaces_windows(): void
    {
        $user = User::factory()->barber()->create();
        $profile = BarberProfile::factory()->create(['user_id' => $user->id]);
        BarberAvailabilityWindow::query()->create([
            'barber_profile_id' => $profile->id,
            'weekday' => 0,
            'starts_at' => '10:00:00',
            'ends_at' => '11:00:00',
        ]);

        $this->withToken($user->createToken('t')->plainTextToken)
            ->putJson("/api/v1/manage/barbers/{$user->id}/availability", [
                'windows' => [
                    ['weekday' => 2, 'starts_at' => '08:00', 'ends_at' => '16:00'],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('weekdays.0.weekday', 2);

        $this->assertDatabaseMissing('barber_availability_windows', [
            'barber_profile_id' => $profile->id,
            'weekday' => 0,
        ]);
    }

    public function test_manage_put_rejects_overlapping_windows(): void
    {
        $user = User::factory()->barber()->create();
        BarberProfile::factory()->create(['user_id' => $user->id]);

        $this->withToken($user->createToken('t')->plainTextToken)
            ->putJson("/api/v1/manage/barbers/{$user->id}/availability", [
                'windows' => [
                    ['weekday' => 1, 'starts_at' => '09:00', 'ends_at' => '12:00'],
                    ['weekday' => 1, 'starts_at' => '11:00', 'ends_at' => '14:00'],
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['windows']);
    }

    public function test_manage_put_rejects_window_end_before_start(): void
    {
        $user = User::factory()->barber()->create();
        BarberProfile::factory()->create(['user_id' => $user->id]);

        $this->withToken($user->createToken('t')->plainTextToken)
            ->putJson("/api/v1/manage/barbers/{$user->id}/availability", [
                'windows' => [
                    ['weekday' => 3, 'starts_at' => '14:00', 'ends_at' => '09:00'],
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['windows']);
    }

    public function test_manage_put_allows_adjacent_windows(): void
    {
        $user = User::factory()->barber()->create();
        BarberProfile::factory()->create(['user_id' => $user->id]);

        $this->withToken($user->createToken('t')->plainTextToken)
            ->putJson("/api/v1/manage/barbers/{$user->id}/availability", [
                'windows' => [
                    ['weekday' => 1, 'starts_at' => '09:00', 'ends_at' => '12:00'],
                    ['weekday' => 1, 'starts_at' => '12:00', 'ends_at' => '17:00'],
                ],
            ])
            ->assertOk()
            ->assertJsonCount(2, 'weekdays.0.windows');
    }

    public function test_admin_can_replace_barber_availability(): void
    {
        $admin = User::factory()->admin()->create();
        $barber = User::factory()->barber()->create();
        BarberProfile::factory()->create(['user_id' => $barber->id]);

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->putJson("/api/v1/manage/barbers/{$barber->id}/availability", [
                'windows' => [
                    ['weekday' => 4, 'starts_at' => '10:00', 'ends_at' => '18:00'],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('weekdays.0.weekday', 4);
    }
}
