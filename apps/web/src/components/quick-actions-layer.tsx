"use client";

import { useOperationalWorkspaceMode } from "@/lib/operational-workspace-context";
import { useSessionProfile } from "@/lib/use-session-profile";
import { cn } from "@ozilcuts/ui";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Clock,
  LayoutGrid,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type QuickActionsVariant = "barber" | "admin";

type QuickActionItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const BARBER_ITEMS: QuickActionItem[] = [
  { href: "/barber/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/barber/hours", label: "Hours", icon: Clock },
  { href: "/barber/analytics", label: "Stats", icon: BarChart3 },
  { href: "/appointments", label: "Bookings", icon: ClipboardList },
];

const ADMIN_ITEMS: QuickActionItem[] = [
  { href: "/admin/services", label: "Catalog", icon: LayoutGrid },
  { href: "/admin/barbers", label: "Team", icon: Users },
  { href: "/admin/reports/revenue", label: "Revenue", icon: TrendingUp },
  { href: "/appointments", label: "Bookings", icon: ClipboardList },
];

function routeActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/") return false;
  return pathname.startsWith(`${href}/`);
}

/**
 * Fixed bottom dock for fast chair-side / shop-admin navigation on small
 * viewports. Actions mirror primary routes — not a modal; full controls
 * remain in page chrome and header.
 */
export function QuickActionsLayer({
  variant,
}: {
  variant: QuickActionsVariant;
}) {
  const pathname = usePathname();
  const { profile } = useSessionProfile();
  const { mode: workspaceMode } = useOperationalWorkspaceMode();

  if (profile.kind !== "ready") return null;

  const slug = profile.user.role.slug;
  if (variant === "barber" && slug !== "barber") return null;
  if (variant === "admin" && slug !== "admin") return null;

  if (variant === "admin" && pathname.startsWith("/admin/onboarding")) {
    return null;
  }

  const items =
    variant === "barber"
      ? workspaceMode === "focused"
        ? BARBER_ITEMS.filter((i) => i.href !== "/barber/analytics")
        : BARBER_ITEMS
      : workspaceMode === "focused"
        ? ADMIN_ITEMS.filter((i) => i.href !== "/admin/reports/revenue")
        : ADMIN_ITEMS;
  const label =
    variant === "barber" ? "Barber quick actions" : "Admin quick actions";

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border/55 bg-background/95 pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] pt-1.5 shadow-[0_-6px_24px_-8px_rgba(0,0,0,0.12)] backdrop-blur-md supports-[backdrop-filter]:bg-background/90 dark:shadow-[0_-6px_28px_-6px_rgba(0,0,0,0.5)]",
        "lg:hidden",
      )}
      aria-label={label}
    >
      <ul className="mx-auto flex max-w-lg justify-stretch gap-0.5 px-1 sm:px-2">
        {items.map(({ href, label: itemLabel, icon: Icon }) => {
          const active = routeActive(pathname, href);
          return (
            <li key={href} className="min-w-0 flex-1">
              <Link
                href={href}
                className={cn(
                  "motion-interactive flex min-h-14 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-semibold leading-tight tracking-tight sm:min-h-[3.25rem] sm:text-[11px]",
                  active
                    ? "bg-primary/15 text-primary dark:bg-primary/25"
                    : "text-muted-foreground hover:bg-muted/55 hover:text-foreground active:bg-muted/70",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-[1.35rem] shrink-0 sm:size-5" aria-hidden />
                <span className="max-w-full truncate">{itemLabel}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
