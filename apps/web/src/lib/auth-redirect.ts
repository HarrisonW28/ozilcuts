import { setStoredAuthToken } from "@/lib/auth-token";
import { getRoleDashboardHref } from "@/lib/dashboard-routes";
import { safeNextPath } from "@/lib/safe-next-path";
import { writeSessionProfileCache } from "@/lib/session-profile-store";
import type { AuthUser } from "@ozilcuts/types";

const AUTH_NEXT_STORAGE_KEY = "ozilcuts_auth_next";

/** Persist intended post-auth path for OAuth (full page leave). */
export function stashAuthNextPath(path: string | null): void {
  if (typeof window === "undefined") return;
  const safe = safeNextPath(path);
  if (!safe || safe === "/") {
    sessionStorage.removeItem(AUTH_NEXT_STORAGE_KEY);
    return;
  }
  try {
    sessionStorage.setItem(AUTH_NEXT_STORAGE_KEY, safe);
  } catch {
    /* storage full */
  }
}

export function takeStashedAuthNextPath(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(AUTH_NEXT_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_NEXT_STORAGE_KEY);
    return safeNextPath(raw);
  } catch {
    return null;
  }
}

export function authPathWithNext(
  base: "/login" | "/register",
  returnTo?: string | null,
): string {
  const next = safeNextPath(returnTo ?? null);
  if (!next || next === "/") return base;
  return `${base}?next=${encodeURIComponent(next)}`;
}

/** Where to send the user after a successful sign-in or registration. */
export function resolvePostAuthPath(
  rawNext: string | null,
  user: AuthUser,
): string {
  const next = safeNextPath(rawNext);
  if (next && next !== "/") return next;
  return getRoleDashboardHref({ kind: "ready", user }) ?? "/home";
}

/** Prime session cache before navigation so destination pages see a signed-in user. */
export function applyAuthSession(token: string, user: AuthUser): void {
  writeSessionProfileCache(token, user);
  setStoredAuthToken(token);
}
