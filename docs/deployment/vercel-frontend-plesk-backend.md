# Deploy: Vercel (frontend) + Plesk (backend)

This app is a **pnpm monorepo**: the Next.js UI lives in `apps/web`, the Laravel API in `apps/backend`. In production, the browser should call the **real API origin** on your Plesk host; dev-only Next.js rewrites (`/api/*` → Laravel) are **not** used when `NODE_ENV` is not `development` (see `apps/web/next.config.ts`).

## 1. Backend on Plesk (Laravel)

### 1.1 Domain and document root

- Point your API hostname (for example `api.yourdomain.com`) at the Laravel **`public`** directory, not the repo root.
- Typical layout after upload or git deploy: application files one level above `public`, with Plesk’s document root = `.../apps/backend/public` (or your chosen deploy path + `/public`).

### 1.2 PHP and extensions

- Use **PHP 8.2+** (match `composer.json` / your local environment).
- Enable common Laravel extensions: `openssl`, `pdo`, `mbstring`, `tokenizer`, `xml`, `curl`, `zip`, `bcmath`, `intl`, and **Redis** (`phpredis`) if you use Redis for cache/queue.

### 1.3 Composer

- In the Laravel root (parent of `public`), run:

```bash
composer install --no-dev --optimize-autoloader
```

- On Plesk you can use **Composer** in the panel, SSH, or a deploy script.

### 1.4 Environment (`.env`)

Copy from `apps/backend/.env.example` and set at least:

| Variable | Purpose |
|----------|---------|
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_KEY` | `php artisan key:generate --show` then paste |
| `APP_URL` | **Public base URL of the API** (e.g. `https://api.yourdomain.com`, no trailing issues on routes) |
| `FRONTEND_URL` | **Public Vercel URL** (e.g. `https://your-app.vercel.app` or custom domain) |
| `DB_*` | Production database credentials |
| `REDIS_*` | If using Redis for cache/queue/sessions |
| `QUEUE_CONNECTION` | Often `redis` in production; run a **queue worker** (see below) |
| `CACHE_STORE` | e.g. `redis` |
| `SESSION_DRIVER` | Often `redis` or `database` |
| `MAIL_*` | Real mailer for delivery |
| `STRIPE_*` | Live keys in production if you take payments |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | `GOOGLE_REDIRECT_URI` must be `${APP_URL}/api/v1/auth/google/callback` |

**CORS / SPA origin:** Laravel must accept browser requests from the Vercel origin. Ensure your deploy allows cross-origin API calls from `https://your-frontend-host` (Laravel default CORS is permissive for many setups; if you add a `config/cors.php`, include the Vercel URL in `allowed_origins`).

**Sanctum (if you use cookie-based SPA auth on the same site):** set `SANCTUM_STATEFUL_DOMAINS` to include your Vercel hostname (no scheme), e.g. `your-app.vercel.app` and any preview domains you need. This project primarily uses **Bearer tokens** from the client; still set `FRONTEND_URL` correctly for links and OAuth return.

### 1.5 App setup commands (once per deploy)

```bash
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

If you use Horizon or schedule:

```bash
php artisan horizon  # or configure Supervisor on the server
```

**Scheduler:** In Plesk, add a cron that runs every minute:

```text
* * * * * cd /path/to/backend && php artisan schedule:run >> /dev/null 2>&1
```

### 1.6 Web server notes

- Prefer **HTTPS** everywhere.
- Point **Stripe webhooks** to: `https://api.yourdomain.com/api/v1/stripe/webhook` (or your mounted path; this project prefixes API with `api/v1` in `routes/api.php`).
- Ensure `storage/` and `bootstrap/cache/` are writable by the PHP user.

### 1.7 Queue worker

With `QUEUE_CONNECTION=redis` (or `database`), run a long-lived worker, e.g. via Plesk **Node.js** “Application” or **Supervisor**, not only cron:

```bash
php artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
```

Adjust `--queue` / connection if your app uses multiple queues.

---

## 2. Frontend on Vercel (Next.js)

### 2.1 Monorepo settings

In the Vercel project:

| Setting | Suggested value |
|--------|------------------|
| **Root Directory** | `apps/web` |
| **Framework preset** | Next.js |
| **Install Command** | `cd ../.. && pnpm install --frozen-lockfile` |
| **Build Command** | `cd ../.. && pnpm --filter web build` |
| **Node.js version** | **20.x+** (see root `package.json` `engines`) |

If Vercel runs install from `apps/web`, `cd ../..` lands on the monorepo root so workspace packages `@ozilcuts/api`, `@ozilcuts/types`, `@ozilcuts/ui` resolve correctly.

Alternative: set project **Root Directory** to the repository root and use:

- **Install:** `pnpm install --frozen-lockfile`
- **Build:** `pnpm build:web`

Then set **Output Directory** to `apps/web/.next` only if you use a custom Next flow; usually Vercel’s Next plugin expects the app root at `apps/web`.

### 2.2 Environment variables (Vercel)

Set in **Project → Settings → Environment Variables**:

| Name | Value | Notes |
|------|--------|--------|
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com` | **No trailing slash.** Required in production so `getApiBaseUrl()` in `packages/api/src/base.ts` hits Plesk, not same-origin. |
| `BACKEND_URL` | Optional in production | Only used for `next.config.ts` **image** `remotePatterns` and **dev** rewrites; you can set it to the same URL as `NEXT_PUBLIC_API_URL` so **Next/Image** can load barber assets from the API host if needed. |

Do **not** rely on `BACKEND_URL` for API traffic in production; rewrites are disabled outside development.

After changing env vars, redeploy.

### 2.3 Custom domains

- Add your production domain on Vercel.
- Update Laravel `FRONTEND_URL` (and any OAuth “authorized redirect” / allowed origins) to that exact URL.

---

## 3. End-to-end checklist

1. **Plesk:** API serves `https://api.yourdomain.com/api/v1/health` (or your health route) with 200.
2. **Vercel:** `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`.
3. **Laravel:** `FRONTEND_URL=https://your-vercel-url`.
4. **Browser:** Open the Vercel site, sign in / book / load barbers; confirm network calls go to the Plesk host, not Vercel `/api`.
5. **Stripe / Google:** Redirect and webhook URLs use the **API** host where applicable; OAuth consent uses the configured `GOOGLE_REDIRECT_URI`.

---

## 4. Local vs production (mental model)

| Environment | API calls from browser |
|-------------|------------------------|
| **Local dev** | Often same-origin via Next rewrites (`/api/v1/...` → `BACKEND_URL`), or `NEXT_PUBLIC_API_URL` if set. |
| **Vercel production** | Always **`NEXT_PUBLIC_API_URL`** → Plesk/Laravel; no rewrites. |

This keeps a single codebase while splitting hosting between Vercel and Plesk.
