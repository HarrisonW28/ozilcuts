"use client";

import {
  shouldHideMobileDrawerNav,
  shouldShowAppShellDock,
} from "@/lib/app-shell-nav";
import { useSessionProfile } from "@/lib/use-session-profile";
import { usePathname } from "next/navigation";

/**
 * Native app-shell routes: SiteHeader comes from the section layout; pages only
 * mount SiteHeader for guests/loading. Page-level Ozilcuts eyebrow is omitted in-shell.
 */
export function useShellPageChrome() {
  const pathname = usePathname();
  const { profile } = useSessionProfile();
  const roleSlug =
    profile.kind === "ready" ? profile.user.role.slug : null;

  const inAppShell = Boolean(
    roleSlug && shouldShowAppShellDock(pathname, roleSlug),
  );

  /** @deprecated Prefer `inAppShell`. */
  const useCompactShellHeader =
    roleSlug === "customer" && inAppShell;

  const hideSiteHeaderMobileMenu = shouldHideMobileDrawerNav(
    pathname,
    roleSlug,
  );

  return {
    inAppShell,
    useCompactShellHeader,
    hideSiteHeaderMobileMenu,
    roleSlug,
  };
}
