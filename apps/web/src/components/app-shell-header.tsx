"use client";

import { AppShellHeaderAccountSkeleton } from "@/components/header-session-chrome";
import { SiteBrandMark } from "@/components/site-brand-mark";
import { NotificationsBell } from "@/components/notifications-bell";
import { NotificationsToaster } from "@/components/notifications-toaster";
import { SiteAccountMenu } from "@/components/site-account-menu";
import type { ProfileState } from "@/lib/use-session-profile";
import { Button, cn } from "@ozilcuts/ui";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AppShellHeaderProps = {
  profile: ProfileState;
  onSignOut: () => void | Promise<void>;
  /** Short label for the current screen (mobile center). */
  title?: string;
  /** Show a back affordance instead of brand lockup. */
  showBack?: boolean;
  backHref?: string;
  className?: string;
};

/**
 * Compact sticky header for native shell routes — safe-area aware, touch targets,
 * no hamburger (primary nav lives in the bottom tab bar on mobile).
 */
export function AppShellHeader({
  profile,
  onSignOut,
  title,
  showBack = false,
  backHref,
  className,
}: AppShellHeaderProps) {
  const router = useRouter();

  return (
    <>
      <header
        className={cn(
          "app-shell-header sticky top-0 z-50 shrink-0 border-b border-border/40",
          "bg-background/92 shadow-[0_1px_0_0_oklch(0.2_0.04_264/0.04)] backdrop-blur-2xl",
          "supports-[backdrop-filter]:bg-background/78",
          "dark:border-border/35 dark:shadow-[0_1px_0_0_oklch(0_0_0/0.22)] dark:supports-[backdrop-filter]:bg-background/72",
          className,
        )}
      >
        <div className="flex min-h-[3.25rem] items-center gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top,0px))] pb-2.5 sm:min-h-14 sm:gap-3 sm:px-6 sm:pb-3 md:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {showBack ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 shrink-0 touch-manipulation sm:size-9"
                aria-label="Go back"
                onClick={() => {
                  if (backHref) {
                    router.push(backHref);
                    return;
                  }
                  if (typeof window !== "undefined" && window.history.length > 1) {
                    router.back();
                    return;
                  }
                  router.push("/home");
                }}
              >
                <ChevronLeft className="size-5" aria-hidden />
              </Button>
            ) : (
              <Link
                href="/"
                aria-label={`${OZILCUTS_APP_NAME} — Home`}
                className="motion-interactive -mx-0.5 flex shrink-0 items-center rounded-md px-1.5 py-1 touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <SiteBrandMark variant="shell" />
              </Link>
            )}
            {title ? (
              <h1 className="min-w-0 truncate text-sm font-semibold tracking-tight text-foreground sm:text-base">
                {title}
              </h1>
            ) : null}
          </div>

          <nav
            className="flex shrink-0 items-center gap-1.5 sm:gap-2"
            aria-label="Account"
            suppressHydrationWarning
          >
            {profile.kind === "none" ? (
              <Link
                href="/login"
                className="motion-interactive rounded-lg px-3 py-2 text-sm font-medium text-primary touch-manipulation"
              >
                Sign in
              </Link>
            ) : null}
            {profile.kind === "loading" ? (
              <AppShellHeaderAccountSkeleton />
            ) : null}
            {profile.kind === "error" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="touch-manipulation"
                onClick={() => void onSignOut()}
              >
                Sign out
              </Button>
            ) : null}
            {profile.kind === "ready" ? (
              <>
                <NotificationsBell enabled />
                <SiteAccountMenu profile={profile} onSignOut={onSignOut} />
              </>
            ) : null}
          </nav>
        </div>
      </header>
      <NotificationsToaster />
    </>
  );
}
