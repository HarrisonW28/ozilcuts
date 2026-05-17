/**
 * Shop logos and hero media are stored on the API after upload.
 * The browser loads them via same-origin `/shop-media/*` (Next rewrites to the API),
 * which avoids cross-origin CORP issues and makes caching reliable.
 */

/** Same-origin prefix; paired with `rewrites()` in `next.config.ts`. */
export const SHOP_MEDIA_PREFIX = "/shop-media/";

/** Storage path under `marketing/` from API `?f=` or `/storage/`. */
export function marketingStoragePathFromUrl(
  url: string,
): string | null {
  try {
    const parsed = new URL(url, "http://shop.local");

    if (parsed.pathname.includes("/public/marketing/asset")) {
      const file = parsed.searchParams.get("f")?.trim();
      if (file && file.startsWith("marketing/") && !file.includes("..")) {
        return file;
      }
      return null;
    }

    if (parsed.pathname.startsWith("/storage/")) {
      const file = parsed.pathname.slice("/storage/".length);
      if (file.startsWith("marketing/") && !file.includes("..")) {
        return file;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/** Public URL for a marketing file path (same-origin). */
export function shopMediaUrlFromStoragePath(path: string): string {
  const normalized = path.replace(/^\/+/, "");
  const segments = normalized.split("/").map((segment) => encodeURIComponent(segment));
  return `${SHOP_MEDIA_PREFIX}${segments.join("/")}`;
}

/**
 * Rewrites API/storage marketing URLs to same-origin `/shop-media/...`.
 * Other URLs are returned unchanged (absolute external links, etc.).
 */
export function resolveShopAssetUrl(
  url: string | null | undefined,
): string | null {
  const raw = url?.trim();
  if (!raw) return null;

  const marketingPath = marketingStoragePathFromUrl(raw);
  if (marketingPath) {
    return shopMediaUrlFromStoragePath(marketingPath);
  }

  try {
    const parsed = new URL(raw);
    return parsed.href;
  } catch {
    return raw;
  }
}
