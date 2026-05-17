"use client";

import { ShellSectionLayout } from "@/components/shell-section-layout";
import { ShellSectionSiteHeader } from "@/components/shell-section-site-header";
import type { AppShellNavVariant } from "@/lib/app-shell-nav";
import { shouldShowAppShellDock } from "@/lib/app-shell-nav";
import { useSessionProfile } from "@/lib/use-session-profile";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Bottom tab shell for routes shared across roles (/appointments, /book, /notifications).
 * SiteHeader is owned here so pages do not mount a second copy.
 */
export function RoleAwareShellLayout({ children }: { children: ReactNode }) {
  const { profile } = useSessionProfile();
  const pathname = usePathname();

  const roleSlug =
    profile.kind === "ready" ? profile.user.role.slug : null;
  const inAppShell = Boolean(
    roleSlug && shouldShowAppShellDock(pathname, roleSlug),
  );

  let variant: AppShellNavVariant | null = null;
  if (profile.kind === "ready") {
    switch (profile.user.role.slug) {
      case "customer":
        variant = "customer";
        break;
      case "barber":
        variant = "barber";
        break;
      case "admin":
        variant = "admin";
        break;
    }
  }

  if (variant === null) {
    return (
      <>
        <ShellSectionSiteHeader />
        {children}
      </>
    );
  }

  return (
    <ShellSectionLayout variant={variant} header="none" siteHeader={inAppShell}>
      {!inAppShell ? <ShellSectionSiteHeader /> : null}
      {children}
    </ShellSectionLayout>
  );
}
