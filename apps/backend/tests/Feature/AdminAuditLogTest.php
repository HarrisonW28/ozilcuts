<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use App\Support\AuditAction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAuditLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_view_audit_logs(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/admin/audit-logs')
            ->assertForbidden();
    }

    public function test_admin_can_list_audit_logs_and_security_review(): void
    {
        $admin = User::factory()->admin()->create();
        $barber = User::factory()->barber()->create();

        AuditLog::query()->create([
            'actor_user_id' => $admin->id,
            'action' => AuditAction::BARBER_CREATED,
            'category' => AuditAction::CATEGORY_PRIVILEGED,
            'severity' => AuditAction::SEVERITY_WARNING,
            'subject_type' => 'barber_profile',
            'subject_id' => 1,
            'target_user_id' => $barber->id,
            'metadata' => ['barber_email' => $barber->email],
            'created_at' => now(),
        ]);

        AuditLog::query()->create([
            'action' => AuditAction::AUTH_LOGIN_FAILED,
            'category' => AuditAction::CATEGORY_SECURITY,
            'severity' => AuditAction::SEVERITY_WARNING,
            'metadata' => ['email' => 'bad@example.com'],
            'created_at' => now(),
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/audit-logs?category=privileged')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.action', AuditAction::BARBER_CREATED);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/security-review')
            ->assertOk()
            ->assertJsonPath('data.role_counts.admin', 1)
            ->assertJsonStructure([
                'data' => [
                    'generated_at',
                    'privileged_actions_24h',
                    'security_events_24h',
                    'failed_logins_24h',
                    'role_escalations_7d',
                    'recent_highlights',
                ],
            ]);
    }

    public function test_failed_login_creates_audit_entry(): void
    {
        User::factory()->create(['email' => 'exists@example.com']);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'exists@example.com',
            'password' => 'wrong-password',
        ])->assertUnprocessable();

        $this->assertDatabaseHas('audit_logs', [
            'action' => AuditAction::AUTH_LOGIN_FAILED,
            'category' => AuditAction::CATEGORY_SECURITY,
        ]);
    }

    public function test_admin_login_success_is_audited(): void
    {
        $admin = User::factory()->admin()->create();

        $this->postJson('/api/v1/auth/login', [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => AuditAction::AUTH_LOGIN_SUCCESS,
            'actor_user_id' => $admin->id,
        ]);
    }
}
