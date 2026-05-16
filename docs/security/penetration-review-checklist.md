# Penetration Review Checklist

Use before each production release and after major feature work. Pair with `php artisan security:production-review` and `scripts/security-audit.sh`.

## Authentication & sessions

- [ ] Login brute-force throttling (auth limiter) verified
- [ ] Registration rate limits and consent fields enforced
- [ ] Password length bounds (max 128) on login/register
- [ ] Sanctum tokens expire; logout revokes tokens
- [ ] OAuth redirect URIs match production hosts only
- [ ] Staff/admin login events appear in audit log

## Authorization

- [ ] Customer cannot access other customers’ appointments, CRM, or analytics
- [ ] Barber scope limited to assigned customers / own calendar where applicable
- [ ] Admin-only routes return 403 for barber and customer tokens
- [ ] Policy coverage on destructive actions (delete note, cancel, export)

## API abuse

- [ ] Booking limits (future appointments, hourly rate) behave as expected
- [ ] Visit-thread duplicate message and rate limits
- [ ] Authenticated and public API baselines throttled
- [ ] No sensitive data in 422/429 error bodies

## Data & privacy

- [ ] Customer data export contains only owning user data
- [ ] Account deletion anonymizes and revokes tokens
- [ ] Audit log records privileged actions without passwords/secrets

## Uploads & media

- [ ] Non-image uploads rejected (extension, MIME, magic bytes)
- [ ] Oversized / decompression bomb dimensions blocked
- [ ] Hair photos served only via authorized controllers (private disk)
- [ ] No direct public URL to `storage/app/private`

## Infrastructure

- [ ] `APP_DEBUG=false` in production
- [ ] TLS end-to-end; HSTS enabled at edge or app
- [ ] CORS limited to known SPA origin(s)
- [ ] Security headers on API and web (nosniff, frame deny, referrer policy)
- [ ] Database connections use TLS (`DB_SSLMODE=require` or stricter)
- [ ] Secrets not committed; rotate Stripe/Google keys on compromise

## Payments

- [ ] Stripe webhook signature validation
- [ ] Webhook route is only CSRF exception
- [ ] Deposit intents tied to appointment metadata

## Client (SPA)

- [ ] Tokens in storage; XSS cannot exfiltrate via inline scripts (CSP on web)
- [ ] No API keys in client bundle except publishable Stripe key
- [ ] Production build has no source maps publicly exposed (if applicable)

## Sign-off

| Role | Name | Date |
|------|------|------|
| Engineering | | |
| Security review | | |
