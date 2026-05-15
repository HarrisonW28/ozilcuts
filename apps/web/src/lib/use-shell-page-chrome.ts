"use client";

import {
  shouldHideMobileDrawerNav,
  shouldShowAppShellDock,
} from "@/lib/app-shell-nav";
import { useSessionProfile } from "@/lib/use-session-profile";
import { usePathname } from "next/navigation";

/**
 * Whether the page should omit SiteHeader because the section layout renders
 * AppShellHeader (customer compact chrome).
 */
export function useShellPageChrome() {
  const pathname = usePathname();
  const { profile } = useSessionProfile();
  const roleSlug =
    profile.kind === "ready" ? profile.user.role.slug : null;

  const useCompactShellHeader =
    roleSlug === "customer" && shouldShowAppShellDock(pathname, "customer");

  const hideSiteHeaderMobileMenu = shouldHideMobileDrawerNav(
    pathname,
    roleSlug,
  );

  return { useCompactShellHeader, hideSiteHeaderMobileMenu, roleSlug };
}
