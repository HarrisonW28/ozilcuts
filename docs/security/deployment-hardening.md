# Deployment Hardening

Production checklist for Ozilcuts API + web. Run automated checks first:

```bash
cd apps/backend && php artisan security:production-review
./scripts/security-audit.sh
```

## Environment

| Variable | Production guidance |
|----------|---------------------|
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_KEY` | Unique per environment; never reuse |
| `FRONTEND_URL` | Canonical HTTPS SPA URL |
| `CORS_ALLOWED_ORIGINS` | Same as SPA origin(s), comma-separated if multiple |
| `SECURITY_FORCE_HTTPS` | `true` when TLS terminates at app |
| `SECURITY_TRUSTED_PROXIES` | Load balancer IPs or `*` behind known proxy |
| `SANCTUM_TOKEN_EXPIRATION_MINUTES` | 43200 (30d) or shorter per policy |
| `DB_SSLMODE` | `require` or `verify-full` |
| `AUDIT_LOG_ENABLED` | `true` |
| `ABUSE_PROTECTION_ENABLED` | `true` |
| `LOG_LEVEL` | `warning` or `error` |

## Laravel deploy steps

1. `composer install --no-dev --optimize-autoloader`
2. `php artisan config:cache && php artisan route:cache && php artisan view:cache`
3. `php artisan migrate --force`
4. Run Horizon/queue workers as non-root
5. Ensure `storage/` and `bootstrap/cache/` are writable only by app user
6. Do not expose `storage/app/private` via web server document root

## Web (Next.js)

1. Set `NEXT_PUBLIC_API_URL` to production API HTTPS origin
2. `pnpm build` with production env
3. Serve with Node or static host; enable HTTPS and security headers (see `next.config.ts`)
4. Restrict `images.remotePatterns` to API host only

## Scaling

- Redis for cache, queue, and sessions in multi-instance deploys
- Rate limiters use Redis when `CACHE_STORE=redis`
- Horizontal API instances behind load balancer with shared DB and Redis
- Monitor audit log growth; archive `audit_logs` per retention policy

## Incident response

- Revoke Sanctum tokens: user logout or delete `personal_access_tokens` rows
- Rotate `APP_KEY` only with planned re-encryption (prefer token revocation first)
- Review `/admin/security` audit log and production readiness report after incidents
