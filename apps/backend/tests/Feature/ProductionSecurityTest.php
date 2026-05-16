<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class ProductionSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_fetch_production_security_review(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/production-security')
            ->assertOk()
            ->assertJsonPath('data.overall_status', fn ($status) => in_array($status, ['pass', 'warn', 'fail'], true))
            ->assertJsonStructure([
                'data' => [
                    'sections',
                    'manual_review' => ['penetration_checklist', 'deployment_guide'],
                ],
            ]);
    }

    public function test_customer_cannot_fetch_production_security_review(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/admin/production-security')
            ->assertForbidden();
    }

    public function test_security_headers_include_cross_origin_policies(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertHeader('Cross-Origin-Opener-Policy', 'same-origin')
            ->assertHeader('Cross-Origin-Resource-Policy', 'same-site');
    }

    public function test_production_review_command_exits_success_in_local(): void
    {
        $this->artisan('security:production-review')
            ->assertSuccessful();
    }

    public function test_production_review_fails_when_debug_enabled_in_production(): void
    {
        config(['app.env' => 'production', 'app.debug' => true]);

        $this->artisan('security:production-review')
            ->assertFailed();
    }

    public function test_secure_upload_rejects_disguised_executable(): void
    {
        $customer = User::factory()->create();
        $this->actingAs($customer, 'sanctum');

        $file = UploadedFile::fake()->create('shell.php', 100, 'image/jpeg');

        $this->postJson('/api/v1/customer/hair-profile/photos', [
            'photo' => $file,
        ])->assertStatus(422);
    }

    public function test_composer_lock_is_present_for_dependency_check(): void
    {
        $this->assertTrue(File::exists(base_path('composer.lock')));
    }
}
