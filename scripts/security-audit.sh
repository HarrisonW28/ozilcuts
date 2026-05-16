#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Composer audit (backend)"
(cd "$ROOT/apps/backend" && composer audit --no-ansi) || true

echo ""
echo "==> Production readiness (backend)"
(cd "$ROOT/apps/backend" && php artisan security:production-review) || true

echo ""
echo "==> pnpm audit (workspace)"
(cd "$ROOT" && pnpm audit --audit-level=high) || true

echo ""
echo "Done. Resolve high/critical findings before production deploy."
