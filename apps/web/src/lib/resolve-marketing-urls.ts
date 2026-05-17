import { resolveShopAssetUrl } from "@/lib/shop-asset-url";
import type { PublicHomeMarketing } from "@ozilcuts/types";

export function resolvePublicHomeMarketingUrls(
  data: PublicHomeMarketing,
): PublicHomeMarketing {
  return {
    ...data,
    logo_url: resolveShopAssetUrl(data.logo_url),
    hero_desktop_mp4: resolveShopAssetUrl(data.hero_desktop_mp4),
    hero_desktop_webm: resolveShopAssetUrl(data.hero_desktop_webm),
    hero_desktop_poster: resolveShopAssetUrl(data.hero_desktop_poster),
    hero_mobile_mp4: resolveShopAssetUrl(data.hero_mobile_mp4),
    hero_mobile_webm: resolveShopAssetUrl(data.hero_mobile_webm),
    hero_mobile_poster: resolveShopAssetUrl(data.hero_mobile_poster),
  };
}
