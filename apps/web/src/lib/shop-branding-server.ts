import { resolvePublicHomeMarketingUrls } from "@/lib/resolve-marketing-urls";
import { fetchPublicHomeMarketing } from "@ozilcuts/api";
import type { PublicHomeMarketing } from "@ozilcuts/types";

/** Server-only: prefetch public shop branding for the root layout. */
export async function loadShopBranding(): Promise<PublicHomeMarketing | null> {
  try {
    const data = await fetchPublicHomeMarketing();
    return resolvePublicHomeMarketingUrls(data);
  } catch {
    return null;
  }
}
