import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Clock,
  Home,
  LayoutDashboard,
  LayoutGrid,
  Scissors,
  TrendingUp,
  User,
  Users,
} from "lucide-react";

export type AppShellNavVariant = "customer" | "barber" | "admin";

export type AppShellNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match nested routes (default true). Set false for exact-only tabs like /home. */
  matchNested?: boolean;
};

export const CUSTOMER_SHELL_ITEMS: AppShellNavItem[] = [
  { href: "/home", label: "Home", icon: Home, matchNested: false },
  { href: "/book", label: "Book", icon: Scissors },
  { href: "/appointments", label: "Visits", icon: ClipboardList },
  { href: "/profile", label: "Profile", icon: User },
];

export const BARBER_SHELL_ITEMS: AppShellNavItem[] = [
  { href: "/barber", label: "Home", icon: LayoutDashboard, matchNested: false },
  { href: "/barber/calendar", label: "Chair", icon: CalendarDays },
  { href: "/barber/hours", label: "Hours", icon: Clock },
  { href: "/barber/analytics", label: "Stats", icon: BarChart3 },
  { href: "/appointments", label: "Bookings", icon: ClipboardList },
];

export const ADMIN_SHELL_ITEMS: AppShellNavItem[] = [
  { href: "/admin", label: "Home", icon: LayoutDashboard, matchNested: false },
  { href: "/admin/services", label: "Catalog", icon: LayoutGrid },
  { href: "/admin/barbers", label: "Team", icon: Users },
  { href: "/admin/reports/revenue", label: "Revenue", icon: TrendingUp },
  { href: "/appointments", label: "Bookings", icon: ClipboardList },
];

export function getAppShellNavItems(
  variant: AppShellNavVariant,
): AppShellNavItem[] {
  switch (variant) {
    case "customer":
      return CUSTOMER_SHELL_ITEMS;
    case "barber":
      return BARBER_SHELL_ITEMS;
    case "admin":
      return ADMIN_SHELL_ITEMS;
  }
}

export function isAppShellRouteActive(
  pathname: string,
  href: string,
  matchNested = true,
): boolean {
  if (pathname === href) return true;
  if (!matchNested) return false;
  if (href === "/") return false;
  if (href === "/admin") return pathname === "/admin";
  if (href === "/barber") return pathname === "/barber";
  if (href === "/home") return pathname === "/home";
  return pathname.startsWith(`${href}/`);
}

/** Path prefixes that render the native bottom tab bar for signed-in roles. */
const CUSTOMER_SHELL_PREFIXES = [
  "/home",
  "/book",
  "/appointments",
  "/profile",
  "/notifications",
] as const;

export function getAppShellVariantForPath(
  pathname: string,
): AppShellNavVariant | null {
  if (pathname === "/barber" || pathname.startsWith("/barber/")) {
    return "barber";
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!pathname.startsWith("/admin/onboarding")) return "admin";
  }

  if (
    CUSTOMER_SHELL_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    )
  ) {
    return "customer";
  }

  return null;
}

/** Whether the signed-in role should see a bottom tab bar on this path. */
export function shouldShowAppShellDock(
  pathname: string,
  roleSlug: string | null,
): boolean {
  if (!roleSlug) return false;
  if (roleSlug === "barber") {
    return pathname === "/barber" || pathname.startsWith("/barber/") || pathname.startsWith("/appointments");
  }
  if (roleSlug === "admin") {
    if (pathname.startsWith("/admin/onboarding")) return false;
    return pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/appointments");
  }
  if (roleSlug === "customer") {
    return CUSTOMER_SHELL_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
  }
  return false;
}

export function shouldHideMobileDrawerNav(
  pathname: string,
  roleSlug: string | null,
): boolean {
  return shouldShowAppShellDock(pathname, roleSlug);
}
