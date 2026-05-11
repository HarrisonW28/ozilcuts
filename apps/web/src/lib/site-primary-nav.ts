import type { ProfileState } from "@/lib/use-session-profile";

export type PrimaryNavLink = { href: string; label: string };

export type PrimaryNavSection = {
  id: string;
  /** Shown above links on mobile only. */
  label?: string;
  links: PrimaryNavLink[];
};

export type AccountMenuIconId =
  | "user"
  | "layout-dashboard"
  | "settings"
  | "sparkles"
  | "history"
  | "bell";

export type AccountMenuLink = {
  href: string;
  label: string;
  icon: AccountMenuIconId;
};

export type AccountMenuGroup = {
  id: string;
  label?: string;
  links: AccountMenuLink[];
};

/** Top-of-page links — role tools mostly live on each role’s dashboard. */
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

/**
 * Account dropdown / mobile drawer: Profile → Dashboard → Settings (role-specific).
 */
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
      id: "profile",
      links: [
        { href: "/profile", label: "Profile", icon: "user" },
        { href: "/profile/hair", label: "Hair", icon: "sparkles" },
        { href: "/profile/visits", label: "Visits", icon: "history" },
      ],
    });
    groups.push({
      id: "dashboard",
      links: [
        { href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" },
      ],
    });
    groups.push({
      id: "settings",
      label: "Settings",
      links: [
        {
          href: "/dashboard/settings",
          label: "Account settings",
          icon: "settings",
        },
      ],
    });
    return groups;
  }

  if (slug === "barber") {
    groups.push({
      id: "profile",
      links: [
        { href: "/barber/profile", label: "Profile", icon: "user" },
      ],
    });
    groups.push({
      id: "dashboard",
      links: [
        { href: "/barber", label: "Dashboard", icon: "layout-dashboard" },
      ],
    });
    groups.push({
      id: "settings",
      label: "Settings",
      links: [
        {
          href: "/dashboard/settings",
          label: "Notifications",
          icon: "bell",
        },
      ],
    });
    return groups;
  }

  if (slug === "admin") {
    groups.push({
      id: "profile",
      links: [
        { href: "/admin/profile", label: "Profile", icon: "user" },
      ],
    });
    groups.push({
      id: "dashboard",
      links: [
        { href: "/admin", label: "Dashboard", icon: "layout-dashboard" },
      ],
    });
    groups.push({
      id: "settings",
      label: "Settings",
      links: [
        {
          href: "/dashboard/settings",
          label: "Shop settings",
          icon: "settings",
        },
      ],
    });
  }

  return groups;
}
