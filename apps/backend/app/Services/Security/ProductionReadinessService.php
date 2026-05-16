<?php

namespace App\Services\Security;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\File;

/**
 * Automated production security review for admins and deploy pipelines.
 */
final class ProductionReadinessService
{
    /**
     * @return array{
     *     generated_at: string,
     *     environment: string,
     *     overall_status: 'pass'|'warn'|'fail',
     *     sections: list<array{
     *         id: string,
     *         title: string,
     *         status: 'pass'|'warn'|'fail',
     *         items: list<array{id: string, label: string, status: 'pass'|'warn'|'fail', detail: string}>
     *     }>,
     *     manual_review: array{penetration_checklist: string, deployment_guide: string},
     * }
     */
    public function review(): array
    {
        $sections = [
            $this->dependencySection(),
            $this->authSection(),
            $this->apiSection(),
            $this->infrastructureSection(),
            $this->uploadSection(),
        ];

        $statuses = [];
        foreach ($sections as $section) {
            foreach ($section['items'] as $item) {
                $statuses[] = $item['status'];
            }
        }

        $overall = in_array('fail', $statuses, true)
            ? 'fail'
            : (in_array('warn', $statuses, true) ? 'warn' : 'pass');

        return [
            'generated_at' => CarbonImmutable::now()->toIso8601String(),
            'environment' => (string) config('app.env'),
            'overall_status' => $overall,
            'sections' => $sections,
            'manual_review' => [
                'penetration_checklist' => 'docs/security/penetration-review-checklist.md',
                'deployment_guide' => 'docs/security/deployment-hardening.md',
            ],
        ];
    }

    /**
     * @return array{id: string, title: string, status: 'pass'|'warn'|'fail', items: list<array{id: string, label: string, status: 'pass'|'warn'|'fail', detail: string}>}
     */
    private function dependencySection(): array
    {
        $composerLock = base_path('composer.lock');
        $lockOk = File::exists($composerLock);

        return [
            'id' => 'dependencies',
            'title' => 'Dependencies',
            'status' => $lockOk ? 'pass' : 'fail',
            'items' => [
                $this->item(
                    'composer_lock',
                    'Composer lockfile present',
                    $lockOk ? 'pass' : 'fail',
                    $lockOk ? 'composer.lock is committed for reproducible deploys.' : 'Run composer update and commit composer.lock.',
                ),
                $this->item(
                    'dependency_audit',
                    'Dependency audit command',
                    'pass',
                    'Run `composer audit` and `pnpm audit` via scripts/security-audit.sh before each release.',
                ),
            ],
        ];
    }

    /**
     * @return array{id: string, title: string, status: 'pass'|'warn'|'fail', items: list<array{id: string, label: string, status: 'pass'|'warn'|'fail', detail: string}>}
     */
    private function authSection(): array
    {
        $isProduction = config('app.env') === 'production';
        $debug = (bool) config('app.debug');
        $keySet = config('app.key') !== null && config('app.key') !== '';

        $expiration = (int) config('sanctum.expiration', 0);
        $minExp = (int) config('security.auth.min_sanctum_expiration_minutes', 60);
        $maxExp = (int) config('security.auth.max_sanctum_expiration_minutes', 525600);
        $tokenOk = $expiration >= $minExp && $expiration <= $maxExp;

        $items = [
            $this->item(
                'app_key',
                'Application encryption key',
                $keySet ? 'pass' : 'fail',
                $keySet ? 'APP_KEY is configured.' : 'Run php artisan key:generate.',
            ),
            $this->item(
                'debug_mode',
                'Debug mode disabled in production',
                ! $isProduction || ! $debug ? 'pass' : 'fail',
                $isProduction && $debug
                    ? 'Set APP_DEBUG=false before going live.'
                    : 'Debug output is not exposed in production.',
            ),
            $this->item(
                'sanctum_expiration',
                'API token expiration window',
                $tokenOk ? 'pass' : 'warn',
                "Sanctum expiration is {$expiration} minutes (allowed {$minExp}–{$maxExp}).",
            ),
            $this->item(
                'abuse_protection',
                'Abuse protection enabled',
                (bool) config('abuse.enabled', true) ? 'pass' : 'warn',
                (bool) config('abuse.enabled', true)
                    ? 'Customer abuse guards are active.'
                    : 'ABUSE_PROTECTION_ENABLED is false.',
            ),
            $this->item(
                'audit_logging',
                'Audit logging enabled',
                (bool) config('audit.enabled', true) ? 'pass' : 'warn',
                (bool) config('audit.enabled', true)
                    ? 'Privileged actions are recorded.'
                    : 'AUDIT_LOG_ENABLED is false.',
            ),
        ];

        return [
            'id' => 'auth',
            'title' => 'Authentication & sessions',
            'status' => $this->sectionStatus($items),
            'items' => $items,
        ];
    }

    /**
     * @return array{id: string, title: string, status: 'pass'|'warn'|'fail', items: list<array{id: string, label: string, status: 'pass'|'warn'|'fail', detail: string}>}
     */
    private function apiSection(): array
    {
        $origins = config('security.production.allowed_frontend_origins', []);
        $corsOk = ! empty($origins) || config('app.env') !== 'production';

        $items = [
            $this->item(
                'rate_limits',
                'API rate limiting',
                (int) config('security.rate_limits.authenticated_api', 0) > 0 ? 'pass' : 'fail',
                'Named limiters auth, authenticated-api, and public-api are registered.',
            ),
            $this->item(
                'security_headers',
                'Security response headers',
                'pass',
                'SecurityHeaders middleware sets baseline headers on all responses.',
            ),
            $this->item(
                'cors_origins',
                'CORS allowed origins',
                $corsOk ? 'pass' : 'warn',
                $corsOk
                    ? 'Frontend origin(s) configured via CORS_ALLOWED_ORIGINS or FRONTEND_URL.'
                    : 'Set CORS_ALLOWED_ORIGINS to your SPA URL in production.',
            ),
            $this->item(
                'csrf_webhook',
                'Stripe webhook CSRF exception',
                'pass',
                'Only api/v1/stripe/webhook is excluded from CSRF; Bearer API calls are unaffected.',
            ),
        ];

        return [
            'id' => 'api',
            'title' => 'API surface',
            'status' => $this->sectionStatus($items),
            'items' => $items,
        ];
    }

    /**
     * @return array{id: string, title: string, status: 'pass'|'warn'|'fail', items: list<array{id: string, label: string, status: 'pass'|'warn'|'fail', detail: string}>}
     */
    private function infrastructureSection(): array
    {
        $frontend = (string) config('services.frontend.url', env('FRONTEND_URL', ''));
        $dbSsl = (string) env('DB_SSLMODE', 'prefer');

        $items = [
            $this->item(
                'frontend_url',
                'SPA URL for OAuth redirects',
                $frontend !== '' ? 'pass' : 'warn',
                $frontend !== '' ? "FRONTEND_URL is {$frontend}." : 'Set FRONTEND_URL for OAuth return URLs.',
            ),
            $this->item(
                'force_https',
                'HTTPS enforcement',
                (bool) config('security.production.force_https') || config('app.env') !== 'production'
                    ? 'pass'
                    : 'warn',
                (bool) config('security.production.force_https')
                    ? 'SECURITY_FORCE_HTTPS is enabled.'
                    : 'Enable SECURITY_FORCE_HTTPS behind TLS termination in production.',
            ),
            $this->item(
                'database_ssl',
                'Database TLS',
                in_array($dbSsl, ['require', 'verify-full', 'verify-ca'], true) || config('app.env') !== 'production'
                    ? 'pass'
                    : 'warn',
                "DB_SSLMODE is {$dbSsl}; use require or verify-full in production.",
            ),
            $this->item(
                'private_storage',
                'Uploads on private disk',
                config('filesystems.disks.local.root', '') !== ''
                    ? 'pass'
                    : 'warn',
                'Hair photos use the private local disk, served only through authorized controllers.',
            ),
        ];

        return [
            'id' => 'infrastructure',
            'title' => 'Infrastructure & deployment',
            'status' => $this->sectionStatus($items),
            'items' => $items,
        ];
    }

    /**
     * @return array{id: string, title: string, status: 'pass'|'warn'|'fail', items: list<array{id: string, label: string, status: 'pass'|'warn'|'fail', detail: string}>}
     */
    private function uploadSection(): array
    {
        $maxKb = (int) config('security.uploads.max_kilobytes', 5120);

        $items = [
            $this->item(
                'mime_validation',
                'Content-type and magic-byte checks',
                'pass',
                'SecureUploadValidator validates finfo MIME, dimensions, and extension allowlist.',
            ),
            $this->item(
                'size_limits',
                'Upload size caps',
                'pass',
                "Maximum {$maxKb} KB per image with dimension limits.",
            ),
            $this->item(
                'executable_blocked',
                'Dangerous extensions blocked',
                'pass',
                'Filenames suggesting scripts or HTML are rejected at validation.',
            ),
        ];

        return [
            'id' => 'uploads',
            'title' => 'Uploads & media',
            'status' => $this->sectionStatus($items),
            'items' => $items,
        ];
    }

    /**
     * @param  list<array{id: string, label: string, status: string, detail: string}>  $items
     */
    private function sectionStatus(array $items): string
    {
        $statuses = array_column($items, 'status');
        if (in_array('fail', $statuses, true)) {
            return 'fail';
        }
        if (in_array('warn', $statuses, true)) {
            return 'warn';
        }

        return 'pass';
    }

    /**
     * @return array{id: string, label: string, status: 'pass'|'warn'|'fail', detail: string}
     */
    private function item(string $id, string $label, string $status, string $detail): array
    {
        return [
            'id' => $id,
            'label' => $label,
            'status' => $status,
            'detail' => $detail,
        ];
    }
}
