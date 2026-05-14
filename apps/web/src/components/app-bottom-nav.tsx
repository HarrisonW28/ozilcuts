"use client";

import { useSessionProfile } from "@/lib/use-session-profile";
import { cn } from "@ozilcuts/ui";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Clock,
  LayoutDashboard,
  LayoutGrid,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type AppBottomNavVariant = "barber" | "admin";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const BARBER_ITEMS: NavItem[] = [
  { href: "/barber", label: "Home", icon: LayoutDashboard },
  { href: "/barber/calendar", label: "Chair", icon: CalendarDays },
  { href: "/barber/hours", label: "Hours", icon: Clock },
  { href: "/barber/analytics", label: "Stats", icon: BarChart3 },
  { href: "/appointments", label: "Bookings", icon: ClipboardList },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: "/admin", label: "Home", icon: LayoutDashboard },
  { href: "/admin/services", label: "Catalog", icon: LayoutGrid },
  { href: "/admin/barbers", label: "Team", icon: Users },
  { href: "/admin/reports/revenue", label: "Revenue", icon: TrendingUp },
  { href: "/appointments", label: "Bookings", icon: ClipboardList },
];

function routeActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/") return false;
  if (href === "/admin") return pathname === "/admin";
  if (href === "/barber") return pathname === "/barber";
  return pathname.startsWith(`${href}/`);
}

/**
 * Native-style bottom tab bar for barber / admin operational areas.
 * Floated inset from screen edges, frosted surface, strong touch targets.
 * Paired with `.app-shell-with-bottom-nav` on the section layout for scroll padding.
 */
export function AppBottomNav({ variant }: { variant: AppBottomNavVariant }) {
  const pathname = usePathname();
  const { profile } = useSessionProfile();

  if (profile.kind !== "ready") return null;

  const slug = profile.user.role.slug;
  if (variant === "barber" && slug !== "barber") return null;
  if (variant === "admin" && slug !== "admin") return null;

  if (variant === "admin" && pathname.startsWith("/admin/onboarding")) {
    return null;
  }

  const items = variant === "barber" ? BARBER_ITEMS : ADMIN_ITEMS;
  const label =
    variant === "barber" ? "Barber navigation" : "Admin navigation";

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:hidden"
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
            {items.map(({ href, label: itemLabel, icon: Icon }) => {
              const active = routeActive(pathname, href);
              return (
                <li key={href} className="min-w-0 flex-1">
                  <Link
                    href={href}
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
