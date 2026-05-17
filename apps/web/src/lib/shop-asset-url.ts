import { getApiBaseUrl } from "@ozilcuts/api";

/**
 * Laravel `Storage::url()` uses APP_URL; rewrite `/storage/*` to the API origin
 * the browser can actually reach (NEXT_PUBLIC_API_URL or same-origin rewrites).
 */
export function resolveShopAssetUrl(
  url: string | null | undefined,
): string | null {
  const raw = url?.trim();
  if (!raw) return null;

  try {
    const apiBase = getApiBaseUrl();
    const parsed = new URL(
      raw,
      apiBase || (typeof window !== "undefined" ? window.location.origin : "http://localhost:8000"),
    );

    const isStoragePath = parsed.pathname.startsWith("/storage/");
    const isMarketingAsset = parsed.pathname.includes(
      "/public/marketing/asset",
    );

    if (!isStoragePath && !isMarketingAsset) {
      return parsed.href;
    }

    if (apiBase) {
      const api = new URL(apiBase);
      return `${api.origin}${parsed.pathname}${parsed.search}`;
    }

    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return raw;
  }
}
