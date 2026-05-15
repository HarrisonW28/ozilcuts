import type { ProfileState } from "@/lib/use-session-profile";

/** Signed-in home (concrete path per role). */
export function getRoleDashboardHref(profile: ProfileState): string | null {
  if (profile.kind !== "ready") return null;
  switch (profile.user.role.slug) {
    case "customer":
      return "/home";
    case "barber":
      return "/barber";
    case "admin":
      return "/admin";
    default:
      return "/";
  }
}

export function getRoleSettingsHref(profile: ProfileState): string | null {
  if (profile.kind !== "ready") return null;
  switch (profile.user.role.slug) {
    case "customer":
      return "/profile";
    case "barber":
      return "/notifications";
    case "admin":
      return "/admin/services";
    default:
      return "/profile";
  }
}
