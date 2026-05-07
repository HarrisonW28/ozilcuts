<?php

namespace Tests\Feature;

use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServiceManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_manage_services_index_forbidden_for_non_admin(): void
    {
        $user = User::factory()->create();

        $this->withToken($user->createToken('t')->plainTextToken)
            ->getJson('/api/v1/manage/services')
            ->assertForbidden();
    }

    public function test_manage_services_index_lists_all_including_inactive(): void
    {
        $admin = User::factory()->admin()->create();
        Service::factory()->create(['name' => 'Active cut', 'is_active' => true]);
        Service::factory()->inactive()->create(['name' => 'Hidden cut']);

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->getJson('/api/v1/manage/services')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_admin_can_create_service_with_generated_slug(): void
    {
        $admin = User::factory()->admin()->create();

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->postJson('/api/v1/manage/services', [
                'name' => 'Signature Fade',
                'description' => 'Detailed work.',
                'duration_minutes' => 40,
                'price_cents' => 4200,
                'sort_order' => 5,
                'is_active' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('name', 'Signature Fade')
            ->assertJsonPath('slug', 'signature-fade')
            ->assertJsonPath('price_cents', 4200);
    }

    public function test_admin_can_update_and_delete_service(): void
    {
        $admin = User::factory()->admin()->create();
        $service = Service::factory()->create([
            'name' => 'Old name',
            'slug' => 'old-name',
            'is_active' => true,
        ]);

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->patchJson("/api/v1/manage/services/{$service->id}", [
                'name' => 'New name',
                'is_active' => false,
            ])
            ->assertOk()
            ->assertJsonPath('name', 'New name')
            ->assertJsonPath('is_active', false);

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->deleteJson("/api/v1/manage/services/{$service->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('services', ['id' => $service->id]);
    }

    public function test_create_rejects_duplicate_slug(): void
    {
        $admin = User::factory()->admin()->create();
        Service::factory()->create(['slug' => 'taken-slug']);

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->postJson('/api/v1/manage/services', [
                'name' => 'Other',
                'slug' => 'taken-slug',
                'duration_minutes' => 30,
                'price_cents' => 3000,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['slug']);
    }
}
