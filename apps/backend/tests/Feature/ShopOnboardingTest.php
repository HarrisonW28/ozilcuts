<?php

namespace Tests\Feature;

use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShopOnboardingTest extends TestCase
{
    use RefreshDatabase;

    public function test_shop_onboarding_patch_forbidden_for_non_admin(): void
    {
        $user = User::factory()->create();

        $this->withToken($user->createToken('t')->plainTextToken)
            ->patchJson('/api/v1/manage/shop-onboarding', [
                'onboarding_step' => 2,
            ])
            ->assertForbidden();
    }

    public function test_admin_can_update_shop_onboarding_fields(): void
    {
        $admin = User::factory()->admin()->create([
            'shop_display_name' => null,
            'onboarding_step' => 1,
            'onboarding_completed_at' => null,
            'shop_pays_cash_only' => true,
            'shop_deposits_enabled' => true,
            'shop_tap_to_pay_later' => true,
        ]);

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->patchJson('/api/v1/manage/shop-onboarding', [
                'shop_display_name' => 'Fade House',
                'onboarding_step' => 3,
                'shop_pays_cash_only' => false,
                'shop_deposits_enabled' => false,
                'shop_tap_to_pay_later' => true,
            ])
            ->assertOk()
            ->assertJsonPath('shop_admin.shop_display_name', 'Fade House')
            ->assertJsonPath('shop_admin.onboarding_step', 3)
            ->assertJsonPath('shop_admin.shop_pays_cash_only', false)
            ->assertJsonPath('shop_admin.shop_deposits_enabled', false)
            ->assertJsonPath('shop_admin.shop_tap_to_pay_later', true);

        $admin->refresh();
        $this->assertSame('Fade House', $admin->shop_display_name);
        $this->assertSame(3, (int) $admin->onboarding_step);
    }

    public function test_complete_flag_marks_onboarding_finished(): void
    {
        $admin = User::factory()->admin()->create([
            'onboarding_step' => 5,
            'onboarding_completed_at' => null,
        ]);

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->patchJson('/api/v1/manage/shop-onboarding', [
                'complete' => true,
            ])
            ->assertOk()
            ->assertJsonPath('shop_admin.onboarding_step', 6);

        $admin->refresh();
        $this->assertNotNull($admin->onboarding_completed_at);
        $this->assertSame(6, (int) $admin->onboarding_step);
    }

    public function test_starter_pack_creates_services_and_skips_existing_slugs(): void
    {
        $admin = User::factory()->admin()->create();

        Service::factory()->create([
            'name' => 'Existing fade',
            'slug' => 'skin-fade',
        ]);

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->postJson('/api/v1/manage/services/starter-pack')
            ->assertOk()
            ->assertJsonPath('skipped_slugs', ['skin-fade']);

        $this->assertTrue(Service::query()->where('slug', 'haircut')->exists());
        $this->assertTrue(Service::query()->where('slug', 'hair-beard')->exists());
        $this->assertTrue(Service::query()->where('slug', 'beard-trim')->exists());
        $this->assertDatabaseCount('services', 4);
    }

    public function test_starter_pack_forbidden_for_non_admin(): void
    {
        $user = User::factory()->create();

        $this->withToken($user->createToken('t')->plainTextToken)
            ->postJson('/api/v1/manage/services/starter-pack')
            ->assertForbidden();
    }

    public function test_user_resource_includes_shop_admin_for_admin(): void
    {
        $admin = User::factory()->admin()->create();

        $this->withToken($admin->createToken('a')->plainTextToken)
            ->getJson('/api/v1/user')
            ->assertOk()
            ->assertJsonStructure([
                'shop_admin' => [
                    'shop_display_name',
                    'onboarding_step',
                    'onboarding_completed_at',
                    'shop_pays_cash_only',
                    'shop_deposits_enabled',
                    'shop_tap_to_pay_later',
                ],
            ]);
    }

    public function test_user_resource_omits_shop_admin_for_customer(): void
    {
        $customer = User::factory()->create();

        $payload = $this->withToken($customer->createToken('c')->plainTextToken)
            ->getJson('/api/v1/user')
            ->assertOk()
            ->json();

        $this->assertSame('customer', $payload['role']['slug']);
        $this->assertArrayNotHasKey('shop_admin', $payload);
    }
}
