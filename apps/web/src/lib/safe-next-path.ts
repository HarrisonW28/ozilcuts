/**
 * Returns a same-origin path for post-login redirects, or null if unsafe.
 * Prevents open redirects via `//evil.com` or absolute URLs.
 */
export function safeNextPath(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (trimmed.includes(":")) return null;

  return trimmed;
}
