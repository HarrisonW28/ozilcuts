"use client";

import {
  shouldHideMobileDrawerNav,
  shouldShowAppShellDock,
} from "@/lib/app-shell-nav";
import { useSessionProfile } from "@/lib/use-session-profile";
import { usePathname } from "next/navigation";

/** Bottom-tab roots where the tab label replaces a large in-page ScreenTitle. */
const APP_SHELL_TAB_ROOTS = new Set([
  "/home",
  "/book",
  "/appointments",
  "/profile",
  "/notifications",
]);

export function isAppShellTabRoot(pathname: string): boolean {
  return APP_SHELL_TAB_ROOTS.has(pathname);
}

/**
 * Native app-shell routes: SiteHeader comes from the section layout.
 * Tab-root screens omit the large ScreenTitle block (bottom nav carries wayfinding).
 */
export function useShellPageChrome() {
  const pathname = usePathname();
  const { profile } = useSessionProfile();
  const roleSlug =
    profile.kind === "ready" ? profile.user.role.slug : null;

  const inAppShell = Boolean(
    roleSlug && shouldShowAppShellDock(pathname, roleSlug),
  );

  const showScreenTitle = !(inAppShell && isAppShellTabRoot(pathname));

  /** @deprecated Prefer `inAppShell`. */
  const useCompactShellHeader =
    roleSlug === "customer" && inAppShell;

  const hideSiteHeaderMobileMenu = shouldHideMobileDrawerNav(
    pathname,
    roleSlug,
  );

  return {
    inAppShell,
    showScreenTitle,
    useCompactShellHeader,
    hideSiteHeaderMobileMenu,
    roleSlug,
  };
}
