"use client";

import {
  getAppShellNavItems,
  isAppShellRouteActive,
  type AppShellNavVariant,
} from "@/lib/app-shell-nav";
import { hapticTouch } from "@/lib/haptics";
import { useSessionProfile } from "@/lib/use-session-profile";
import { cn, Skeleton } from "@ozilcuts/ui";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export type AppBottomNavVariant = AppShellNavVariant;

/**
 * Native-style bottom tab bar for customer / barber / admin operational areas.
 * Floated inset from screen edges, frosted surface, strong touch targets.
 * Paired with `.app-shell-with-bottom-nav` on the section layout for scroll padding.
 */
export function AppBottomNav({ variant }: { variant: AppBottomNavVariant }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useSessionProfile();

  if (profile.kind === "loading") {
    const items = getAppShellNavItems(variant);
    return (
      <nav
        className="app-shell-bottom-nav pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:hidden"
        aria-busy="true"
        aria-label="Loading navigation"
      >
        <div className="pointer-events-auto mx-auto max-w-lg px-2 pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] pt-1">
          <div
            className={cn(
              "rounded-2xl border border-border/55 bg-background/88 shadow-[0_-8px_32px_-10px_rgba(0,0,0,0.14)] backdrop-blur-2xl",
              "supports-[backdrop-filter]:bg-background/78",
              "dark:border-border/50 dark:bg-background/82 dark:shadow-[0_-10px_36px_-8px_rgba(0,0,0,0.55)] dark:supports-[backdrop-filter]:bg-background/72",
            )}
          >
            <ul className="flex justify-stretch gap-0.5 px-1 py-1.5 sm:px-1.5 sm:py-2">
              {items.map((item) => (
                <li key={item.href} className="min-w-0 flex-1">
                  <div className="flex min-h-[3.25rem] flex-col items-center justify-center gap-1 py-1 sm:min-h-14">
                    <Skeleton className="size-[1.4rem] rounded-md sm:size-5" />
                    <Skeleton className="h-2.5 w-10 rounded-md" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>
    );
  }

  if (profile.kind !== "ready") return null;

  const slug = profile.user.role.slug;
  if (variant === "customer" && slug !== "customer") return null;
  if (variant === "barber" && slug !== "barber") return null;
  if (variant === "admin" && slug !== "admin") return null;

  if (variant === "admin" && pathname.startsWith("/admin/onboarding")) {
    return null;
  }

  const items = getAppShellNavItems(variant);
  const label =
    variant === "customer"
      ? "Customer navigation"
      : variant === "barber"
        ? "Barber navigation"
        : "Admin navigation";

  return (
    <nav
      className="app-shell-bottom-nav pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:hidden"
      aria-label={label}
    >
      <div className="pointer-events-auto mx-auto max-w-lg px-2 pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] pt-1">
        <div
          className={cn(
            "rounded-2xl border border-border/55 bg-background/88 shadow-[0_-8px_32px_-10px_rgba(0,0,0,0.14)] backdrop-blur-2xl",
            "supports-[backdrop-filter]:bg-background/78",
            "dark:border-border/50 dark:bg-background/82 dark:shadow-[0_-10px_36px_-8px_rgba(0,0,0,0.55)] dark:supports-[backdrop-filter]:bg-background/72",
          )}
        >
          <ul className="flex justify-stretch gap-0.5 px-1 py-1.5 sm:px-1.5 sm:py-2">
            {items.map(({ href, label: itemLabel, icon: Icon, matchNested }) => {
              const active = isAppShellRouteActive(
                pathname,
                href,
                matchNested ?? true,
              );
              return (
                <li key={href} className="min-w-0 flex-1">
                  <Link
                    href={href}
                    prefetch
                    onPointerDown={(ev) => {
                      if (!active) {
                        hapticTouch("selection", ev.pointerType);
                      }
                    }}
                    onPointerEnter={() => {
                      try {
                        router.prefetch(href);
                      } catch {
                        /* noop */
                      }
                    }}
                    className={cn(
                      "motion-interactive relative flex min-h-[3.25rem] touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 text-[10px] font-semibold leading-tight tracking-tight sm:min-h-14 sm:text-[11px]",
                      "motion-safe:active:scale-[0.97]",
                      active
                        ? "text-primary"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground active:bg-muted/65",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {active ? (
                      <span
                        className="absolute inset-x-1 top-1 h-0.5 rounded-full bg-primary/90"
                        aria-hidden
                      />
                    ) : null}
                    <Icon
                      className={cn(
                        "relative z-[1] size-[1.4rem] shrink-0 sm:size-5",
                        active && "text-primary",
                      )}
                      aria-hidden
                    />
                    <span className="relative z-[1] max-w-full truncate">
                      {itemLabel}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
