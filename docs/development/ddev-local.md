# Local development with DDEV

This monorepo is **Next.js** (`apps/web`) + **Laravel** (`apps/backend`). DDEV must not use `apps/web` as the nginx docroot — there is no `index.php`, which causes **nginx 403 Forbidden**.

## URLs after `ddev start`

| Service | URL |
|---------|-----|
| **Next.js (UI)** | https://ozilcuts.ddev.site:3000 |
| **Laravel API** | https://ozilcuts.ddev.site/api/v1/health |
| **Mailpit** | https://ozilcuts.ddev.site:8026 |

## First-time setup

```bash
ddev start
ddev exec "cd apps/backend && composer install"
ddev exec "cd apps/backend && cp -n .env.example .env && php artisan key:generate"
ddev exec "cd apps/backend && php artisan migrate"
```

In `apps/web/.env.local` (create if needed):

```env
BACKEND_URL=https://ozilcuts.ddev.site
NEXT_PUBLIC_API_URL=https://ozilcuts.ddev.site
```

Open the **frontend** at https://ozilcuts.ddev.site:3000 (not the bare `.ddev.site` URL without a port).

## Without DDEV for the UI

You can also run only the API in DDEV and Next on the host:

```bash
ddev start
pnpm dev:web
```

Then use http://localhost:3000 with `BACKEND_URL=https://ozilcuts.ddev.site`.
