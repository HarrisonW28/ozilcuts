# Local development with DDEV

This monorepo is **Next.js** (`apps/web`) + **Laravel** (`apps/backend`).

| URL | What you get |
|-----|----------------|
| **https://ozilcuts.ddev.site** | Redirects to the Next.js app (port 3000) in `local` |
| **https://ozilcuts.ddev.site:3000** | Next.js UI (use this if the redirect does not fire) |
| **https://ozilcuts.ddev.site/api/v1/health** | Laravel API health check |

## Quick start (frontend)

```bash
ddev start
```

Wait ~30–60s the first time (Composer, migrations, `pnpm install`, Next dev server).

Then open **https://ozilcuts.ddev.site** or **https://ozilcuts.ddev.site:3000**.

Create `apps/web/.env.local`:

```env
BACKEND_URL=https://ozilcuts.ddev.site
NEXT_PUBLIC_API_URL=https://ozilcuts.ddev.site
```

## If you see “Table 'sessions' doesn't exist”

Migrations did not run. Fix once:

```bash
ddev exec "cd apps/backend && php artisan migrate --force"
```

Or restart the project so the `post-start` hook runs again:

```bash
ddev restart
```

## Easiest path: API in DDEV, Next on your Mac

```bash
ddev start
ddev exec "cd apps/backend && php artisan migrate --force"
pnpm install
pnpm dev:web
```

Open **http://localhost:3000** with the same `apps/web/.env.local` values above.

## Check Next is running inside DDEV

```bash
ddev logs -s web | tail -30
```

You should see Next listening on `0.0.0.0:3000`.
