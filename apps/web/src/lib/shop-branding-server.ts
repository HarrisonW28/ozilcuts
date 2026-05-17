import { resolveShopAssetUrl } from "@/lib/shop-asset-url";
import { fetchPublicHomeMarketing } from "@ozilcuts/api";
import type { PublicHomeMarketing } from "@ozilcuts/types";

function resolveMarketingUrls(
  data: PublicHomeMarketing,
): PublicHomeMarketing {
  return {
    ...data,
    logo_url: resolveShopAssetUrl(data.logo_url),
    hero_mp4: resolveShopAssetUrl(data.hero_mp4),
    hero_webm: resolveShopAssetUrl(data.hero_webm),
    hero_poster: resolveShopAssetUrl(data.hero_poster),
  };
}

/** Server-only: prefetch public shop branding for the root layout. */
export async function loadShopBranding(): Promise<PublicHomeMarketing | null> {
  try {
    const data = await fetchPublicHomeMarketing();
    return resolveMarketingUrls(data);
  } catch {
    return null;
  }
}
