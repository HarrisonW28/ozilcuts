<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ShopHomeMarketingTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_home_marketing_returns_empty_when_not_configured(): void
    {
        User::factory()->admin()->create();

        $this->getJson('/api/v1/public/home-marketing')
            ->assertOk()
            ->assertJsonPath('data.logo_url', null)
            ->assertJsonPath('data.hero_desktop_mp4', null)
            ->assertJsonPath('data.hero_desktop_webm', null)
            ->assertJsonPath('data.hero_desktop_poster', null)
            ->assertJsonPath('data.hero_mobile_mp4', null)
            ->assertJsonPath('data.hero_mobile_webm', null)
            ->assertJsonPath('data.hero_mobile_poster', null)
            ->assertJsonPath('data.instagram_handle', 'ozil.cuts')
            ->assertJsonPath('data.instagram_url', 'https://www.instagram.com/ozil.cuts/')
            ->assertJsonPath('data.shop_hours', null)
            ->assertJsonPath('data.shop_latitude', null);
    }

    public function test_public_home_marketing_includes_visit_hours_and_map_coordinates(): void
    {
        $admin = User::factory()->admin()->create([
            'shop_display_name' => 'Ozil Cuts Studio',
            'shop_public_address' => '12 High Street',
            'shop_visit_note' => 'Ring the bell on arrival.',
            'shop_latitude' => 51.5074,
            'shop_longitude' => -0.1278,
            'shop_default_hours' => [
                ['weekday' => 1, 'starts_at' => '10:00', 'ends_at' => '18:00'],
                ['weekday' => 2, 'starts_at' => '10:00', 'ends_at' => '18:00'],
            ],
        ]);

        $this->getJson('/api/v1/public/home-marketing')
            ->assertOk()
            ->assertJsonPath('data.shop_display_name', 'Ozil Cuts Studio')
            ->assertJsonPath('data.shop_public_address', '12 High Street')
            ->assertJsonPath('data.shop_visit_note', 'Ring the bell on arrival.')
            ->assertJsonPath('data.shop_latitude', 51.5074)
            ->assertJsonPath('data.shop_longitude', -0.1278)
            ->assertJsonPath('data.shop_hours.weekdays.0.weekday', 1)
            ->assertJsonPath('data.shop_hours.weekdays.0.windows.0.starts_at', '10:00');

        $this->assertSame('Ozil Cuts Studio', $admin->shop_display_name);
    }

    public function test_admin_can_set_instagram_handle_and_public_endpoint_reflects_it(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/v1/admin/marketing/instagram', [
                'instagram_handle' => '@ozil.cuts',
            ])
            ->assertOk()
            ->assertJsonPath('shop_admin.shop_instagram_handle', 'ozil.cuts');

        $this->getJson('/api/v1/public/home-marketing')
            ->assertOk()
            ->assertJsonPath('data.instagram_handle', 'ozil.cuts')
            ->assertJsonPath('data.instagram_url', 'https://www.instagram.com/ozil.cuts/');
    }

    public function test_admin_can_upload_logo_and_public_endpoint_serves_url(): void
    {
        Storage::fake('public');

        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->post('/api/v1/admin/marketing/logo', [
                'logo' => UploadedFile::fake()->image('logo.png', 200, 80),
            ])
            ->assertOk()
            ->assertJsonPath('shop_admin.shop_logo_path', fn ($path) => is_string($path) && $path !== '');

        $admin->refresh();
        $this->assertNotNull($admin->shop_logo_path);
        Storage::disk('public')->assertExists($admin->shop_logo_path);

        $home = $this->getJson('/api/v1/public/home-marketing')
            ->assertOk()
            ->assertJsonPath('data.logo_url', fn ($url) => is_string($url) && str_contains($url, 'marketing/asset'))
            ->json('data');

        $logoUrl = $home['logo_url'] ?? '';
        $this->assertIsString($logoUrl);
        $this->get($logoUrl)->assertOk();
    }

    public function test_admin_can_upload_desktop_hero_video_and_public_endpoint_serves_url(): void
    {
        Storage::fake('public');

        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->post('/api/v1/admin/marketing/hero-video', [
                'video' => UploadedFile::fake()->create('hero.mp4', 128, 'video/mp4'),
                'variant' => 'desktop',
            ])
            ->assertOk();

        $admin->refresh();
        $this->assertNotNull($admin->shop_hero_video_path);
        Storage::disk('public')->assertExists($admin->shop_hero_video_path);

        $this->getJson('/api/v1/public/home-marketing')
            ->assertOk()
            ->assertJsonPath('data.hero_desktop_mp4', fn ($url) => is_string($url) && str_contains($url, 'hero'))
            ->assertJsonPath('data.hero_mobile_mp4', null);
    }

    public function test_admin_can_upload_mobile_hero_video(): void
    {
        Storage::fake('public');

        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->post('/api/v1/admin/marketing/hero-video', [
                'video' => UploadedFile::fake()->create('hero-mobile.mp4', 128, 'video/mp4'),
                'variant' => 'mobile',
            ])
            ->assertOk();

        $admin->refresh();
        $this->assertNotNull($admin->shop_hero_video_mobile_path);
        Storage::disk('public')->assertExists($admin->shop_hero_video_mobile_path);

        $this->getJson('/api/v1/public/home-marketing')
            ->assertOk()
            ->assertJsonPath('data.hero_mobile_mp4', fn ($url) => is_string($url) && str_contains($url, 'hero'))
            ->assertJsonPath('data.hero_desktop_mp4', null);
    }

    public function test_customer_cannot_upload_hero_video(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer, 'sanctum')
            ->post('/api/v1/admin/marketing/hero-video', [
                'video' => UploadedFile::fake()->create('hero.mp4', 128, 'video/mp4'),
            ])
            ->assertForbidden();
    }
}
