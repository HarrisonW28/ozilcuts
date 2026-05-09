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
      links: [{ href: "/dashboard", label: "Dashboard" }],
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
      links: [{ href: "/barber", label: "Dashboard" }],
    });
    groups.push({
      id: "settings",
      label: "Settings",
      links: [{ href: "/dashboard/settings", label: "Notifications" }],
    });
    return groups;
  }

  if (slug === "admin") {
    groups.push({
      id: "dashboard",
      links: [{ href: "/admin", label: "Dashboard" }],
    });
  }

  return groups;
}
