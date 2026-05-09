import type { ProfileState } from "@/lib/use-session-profile";

export type PrimaryNavLink = { href: string; label: string };

export type PrimaryNavSection = {
  id: string;
  /** Shown above links on mobile only. */
  label?: string;
  links: PrimaryNavLink[];
};

export type AccountMenuGroup = {
  id: string;
  label?: string;
  links: PrimaryNavLink[];
};

/** Top-of-page links — role tools live in the account menu. */
export function getPrimaryNavSections(profile: ProfileState): PrimaryNavSection[] {
  const sections: PrimaryNavSection[] = [
    {
      id: "browse",
      label: "Discover",
      links: [
        { href: "/services", label: "Services" },
        { href: "/barbers", label: "Team" },
        { href: "/#visit", label: "Visit" },
        { href: "/book", label: "Book" },
      ],
    },
  ];

  if (profile.kind !== "ready") {
    return sections;
  }

  sections.push({
    id: "appointments",
    links: [{ href: "/appointments", label: "My appointments" }],
  });

  return sections;
}

/** Account menu: role dashboards, customer-only account pages, shared settings alias. */
export function getAccountMenuGroups(
  profile: ProfileState,
): AccountMenuGroup[] {
  if (profile.kind !== "ready") {
    return [];
  }

  const groups: AccountMenuGroup[] = [];
  const slug = profile.user.role.slug;

  if (slug === "customer") {
    groups.push({
      id: "dashboard",
      label: "Dashboard",
      links: [{ href: "/dashboard", label: "My dashboard" }],
    });
    groups.push({
      id: "account",
      label: "Account",
      links: [
        { href: "/profile", label: "Profile" },
        { href: "/profile/hair", label: "Hair" },
        { href: "/profile/visits", label: "Visits" },
      ],
    });
    groups.push({
      id: "settings",
      label: "Settings",
      links: [{ href: "/dashboard/settings", label: "Account settings" }],
    });
    return groups;
  }

  if (slug === "barber") {
    groups.push({
      id: "dashboard",
      label: "Dashboard",
      links: [
        { href: "/barber/calendar", label: "Calendar" },
        { href: "/barber/hours", label: "Hours" },
        { href: "/barber/analytics", label: "Analytics" },
      ],
    });
    groups.push({
      id: "settings",
      label: "Settings",
      links: [{ href: "/dashboard/settings", label: "Notifications" }],
    });
    return groups;
  }

  if (slug === "admin") {
    const sa = profile.user.shop_admin;
    const setupIncomplete = Boolean(sa && !sa.onboarding_completed_at);

    groups.push({
      id: "dashboard",
      label: "Dashboard",
      links: [
        { href: "/admin", label: "Shop overview" },
        ...(setupIncomplete
          ? [{ href: "/admin/onboarding", label: "Finish shop setup" }]
          : []),
      ],
    });

    groups.push({
      id: "site-settings",
      label: "Site settings",
      links: [
        { href: "/admin/services", label: "Catalog & services" },
        { href: "/admin/barbers", label: "Team & barbers" },
      ],
    });

    groups.push({
      id: "reports",
      label: "Reports",
      links: [
        { href: "/admin/reports/revenue", label: "Revenue" },
        { href: "/admin/reports/barbers", label: "Compare barbers" },
        { href: "/admin/reports/customers", label: "Customers" },
        { href: "/admin/reports/operations", label: "Operations" },
        { href: "/admin/reports/retention", label: "Retention" },
      ],
    });
  }

  return groups;
}
