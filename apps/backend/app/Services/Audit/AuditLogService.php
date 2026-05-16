<?php

namespace App\Services\Audit;

use App\Models\AuditLog;
use App\Models\User;
use App\Support\AuditAction;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

/**
 * Append-only audit trail for privileged staff actions and security events.
 */
final class AuditLogService
{
    public function record(
        string $action,
        ?User $actor = null,
        ?Request $request = null,
        ?string $subjectType = null,
        ?int $subjectId = null,
        ?int $targetUserId = null,
        array $metadata = [],
        ?string $category = null,
        ?string $severity = null,
    ): AuditLog {
        if (! (bool) config('audit.enabled', true)) {
            return new AuditLog([
                'action' => $action,
                'category' => $category ?? AuditAction::defaultsFor($action)['category'],
                'severity' => $severity ?? AuditAction::defaultsFor($action)['severity'],
            ]);
        }

        $defaults = AuditAction::defaultsFor($action);
        $redacted = $this->redactMetadata($metadata);

        return AuditLog::query()->create([
            'actor_user_id' => $actor?->id,
            'action' => $action,
            'category' => $category ?? $defaults['category'],
            'severity' => $severity ?? $defaults['severity'],
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'target_user_id' => $targetUserId,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent()
                ? mb_substr((string) $request->userAgent(), 0, 512)
                : null,
            'metadata' => $redacted === [] ? null : $redacted,
            'created_at' => now(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $metadata
     * @return array<string, mixed>
     */
    private function redactMetadata(array $metadata): array
    {
        $keys = ['password', 'password_confirmation', 'token', 'client_secret'];

        return Arr::except($metadata, $keys);
    }
}
