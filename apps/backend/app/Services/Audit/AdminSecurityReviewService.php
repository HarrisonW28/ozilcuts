<?php

namespace App\Services\Audit;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use App\Support\AuditAction;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Enterprise accountability snapshot for shop administrators.
 */
final class AdminSecurityReviewService
{
    /**
     * @return array{
     *     generated_at: string,
     *     role_counts: array{admin: int, barber: int, customer: int},
     *     window_hours: int,
     *     privileged_actions_24h: int,
     *     security_events_24h: int,
     *     failed_logins_24h: int,
     *     staff_logins_24h: int,
     *     role_escalations_7d: list<array<string, mixed>>,
     *     categories_7d: list<array{category: string, count: int}>,
     *     recent_highlights: list<array<string, mixed>>,
     * }
     */
    public function snapshot(): array
    {
        $now = CarbonImmutable::now();
        $since24h = $now->subDay();
        $since7d = $now->subDays(7);

        $roleCounts = User::query()
            ->join('roles', 'roles.id', '=', 'users.role_id')
            ->select('roles.slug', DB::raw('count(*) as aggregate'))
            ->groupBy('roles.slug')
            ->pluck('aggregate', 'slug');

        $privileged24h = AuditLog::query()
            ->where('category', AuditAction::CATEGORY_PRIVILEGED)
            ->where('created_at', '>=', $since24h)
            ->count();

        $security24h = AuditLog::query()
            ->where('category', AuditAction::CATEGORY_SECURITY)
            ->where('created_at', '>=', $since24h)
            ->count();

        $failedLogins24h = AuditLog::query()
            ->where('action', AuditAction::AUTH_LOGIN_FAILED)
            ->where('created_at', '>=', $since24h)
            ->count();

        $staffLogins24h = AuditLog::query()
            ->where('action', AuditAction::AUTH_LOGIN_SUCCESS)
            ->where('created_at', '>=', $since24h)
            ->where(function ($q): void {
                $q->where('metadata->role', Role::SLUG_ADMIN)
                    ->orWhere('metadata->role', Role::SLUG_BARBER);
            })
            ->count();

        $escalations = AuditLog::query()
            ->where('action', AuditAction::BARBER_CREATED)
            ->where('created_at', '>=', $since7d)
            ->with(['actor:id,name,email', 'targetUser:id,name,email'])
            ->orderByDesc('id')
            ->limit(10)
            ->get()
            ->map(fn (AuditLog $row) => $this->serializeHighlight($row))
            ->all();

        $categories7d = AuditLog::query()
            ->where('created_at', '>=', $since7d)
            ->select('category', DB::raw('count(*) as aggregate'))
            ->groupBy('category')
            ->orderByDesc('aggregate')
            ->get()
            ->map(fn ($row) => [
                'category' => (string) $row->category,
                'count' => (int) $row->aggregate,
            ])
            ->all();

        $highlights = AuditLog::query()
            ->whereIn('severity', [AuditAction::SEVERITY_WARNING, AuditAction::SEVERITY_CRITICAL])
            ->where('created_at', '>=', $since7d)
            ->with(['actor:id,name,email', 'targetUser:id,name,email'])
            ->orderByDesc('id')
            ->limit(8)
            ->get()
            ->map(fn (AuditLog $row) => $this->serializeHighlight($row))
            ->all();

        return [
            'generated_at' => $now->toIso8601String(),
            'role_counts' => [
                'admin' => (int) ($roleCounts[Role::SLUG_ADMIN] ?? 0),
                'barber' => (int) ($roleCounts[Role::SLUG_BARBER] ?? 0),
                'customer' => (int) ($roleCounts[Role::SLUG_CUSTOMER] ?? 0),
            ],
            'window_hours' => 24,
            'privileged_actions_24h' => $privileged24h,
            'security_events_24h' => $security24h,
            'failed_logins_24h' => $failedLogins24h,
            'staff_logins_24h' => $staffLogins24h,
            'role_escalations_7d' => $escalations,
            'categories_7d' => $categories7d,
            'recent_highlights' => $highlights,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeHighlight(AuditLog $row): array
    {
        return [
            'id' => $row->id,
            'action' => $row->action,
            'category' => $row->category,
            'severity' => $row->severity,
            'created_at' => $row->created_at?->toIso8601String(),
            'actor' => $row->actor === null
                ? null
                : [
                    'id' => $row->actor->id,
                    'name' => $row->actor->name,
                    'email' => $row->actor->email,
                ],
            'target_user' => $row->targetUser === null
                ? null
                : [
                    'id' => $row->targetUser->id,
                    'name' => $row->targetUser->name,
                    'email' => $row->targetUser->email,
                ],
            'metadata' => $row->metadata ?? [],
        ];
    }
}
