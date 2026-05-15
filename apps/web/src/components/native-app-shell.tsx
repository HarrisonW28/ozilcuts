"use client";

import { AppBottomNav } from "@/components/app-bottom-nav";
import { AppShellHeader } from "@/components/app-shell-header";
import type { AppShellNavVariant } from "@/lib/app-shell-nav";
import { shouldShowAppShellDock } from "@/lib/app-shell-nav";
import { useSessionProfile } from "@/lib/use-session-profile";
import { cn } from "@ozilcuts/ui";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NativeAppShellProps = {
  variant: AppShellNavVariant;
  children: ReactNode;
  /** Compact shell header (mobile tab-bar routes). Omit on pages that mount SiteHeader. */
  header?: "compact" | "none";
  headerTitle?: string;
  headerShowBack?: boolean;
  headerBackHref?: string;
};

/**
 * Native mobile shell: safe-area viewport, optional compact header, bottom tab bar,
 * scroll padding, and route enter transitions (via parent template `.app-shell-route`).
 */
export function NativeAppShell({
  variant,
  children,
  header = "none",
  headerTitle,
  headerShowBack,
  headerBackHref,
}: NativeAppShellProps) {
  const pathname = usePathname();
  const { profile, signOut } = useSessionProfile();
  const roleSlug =
    profile.kind === "ready" ? profile.user.role.slug : null;

  const roleMatchesVariant =
    (variant === "customer" && roleSlug === "customer") ||
    (variant === "barber" && roleSlug === "barber") ||
    (variant === "admin" && roleSlug === "admin");

  const showDock =
    roleMatchesVariant && shouldShowAppShellDock(pathname, roleSlug);

  return (
    <div
      className={cn(
        "app-shell-viewport flex min-h-dvh min-h-0 flex-1 flex-col",
        showDock && "app-shell-with-bottom-nav",
      )}
    >
      {header === "compact" ? (
        <AppShellHeader
          profile={profile}
          onSignOut={signOut}
          title={headerTitle}
          showBack={headerShowBack}
          backHref={headerBackHref}
        />
      ) : null}
      <div className="app-shell-main flex min-h-0 flex-1 flex-col">{children}</div>
      {showDock ? <AppBottomNav variant={variant} /> : null}
    </div>
  );
}
