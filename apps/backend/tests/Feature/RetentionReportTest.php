<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RetentionReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_retention_report_requires_authentication(): void
    {
        $this->getJson('/api/v1/admin/reports/retention')->assertUnauthorized();
    }

    public function test_retention_report_requires_admin(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/admin/reports/retention')
            ->assertForbidden();
    }

    public function test_admin_can_fetch_retention_snapshot(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/reports/retention')
            ->assertOk()
            ->assertJsonStructure([
                'due_soon',
                'inactive_eligible',
            ]);
    }
}
