import type { OperationalWorkspaceMode } from "@/lib/operational-workspace-mode";
import type { ProfileState } from "@/lib/use-session-profile";

export type PrimaryNavLink = { href: string; label: string };

export type PrimaryNavSection = {
  id: string;
  /** Shown above links on mobile only. */
  label?: string;
  links: PrimaryNavLink[];
};

export function getPrimaryNavSections(
  profile: ProfileState,
  workspaceMode: OperationalWorkspaceMode = "focused",
): PrimaryNavSection[] {
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

  if (profile.user.role.slug === "customer") {
    sections.push({
      id: "you",
      label: "Your account",
      links: [
        { href: "/profile", label: "Profile" },
        { href: "/profile/hair", label: "Hair" },
        { href: "/profile/visits", label: "Visits" },
      ],
    });
  }

  sections.push({
    id: "appointments",
    links: [{ href: "/appointments", label: "My appointments" }],
  });

  if (profile.user.role.slug === "barber") {
    const barberLinks: PrimaryNavLink[] =
      workspaceMode === "focused"
        ? [
            { href: "/barber/calendar", label: "Calendar" },
            { href: "/barber/hours", label: "Hours" },
          ]
        : [
            { href: "/barber/calendar", label: "Calendar" },
            { href: "/barber/hours", label: "Hours" },
            { href: "/barber/analytics", label: "Analytics" },
          ];
    sections.push({
      id: "barber",
      label: "Barber tools",
      links: barberLinks,
    });
  }

  if (profile.user.role.slug === "admin") {
    sections.push({
      id: "admin-shop",
      label: "Your shop",
      links: [
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/services", label: "Catalog" },
        { href: "/admin/barbers", label: "Team" },
      ],
    });
    if (workspaceMode !== "focused") {
      sections.push({
        id: "admin-reports",
        label: "Reports",
        links: [
          { href: "/admin/reports/revenue", label: "Revenue" },
          { href: "/admin/reports/barbers", label: "Compare" },
          { href: "/admin/reports/customers", label: "Customers" },
          { href: "/admin/reports/operations", label: "Ops" },
          { href: "/admin/reports/retention", label: "Retention" },
        ],
      });
    }
  }

  return sections;
}
