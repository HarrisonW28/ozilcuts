"use client";

import { useSessionProfile } from "@/lib/use-session-profile";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/**
 * Sends shop admins through guided setup until they mark onboarding complete.
 * During setup they may open team, catalog, and barber hours without being
 * bounced back to this page only.
 */
export function AdminOnboardingGate({ children }: { children: ReactNode }) {
  const { profile } = useSessionProfile();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (profile.kind !== "ready") return;
    if (profile.user.role.slug !== "admin") return;
    const sa = profile.user.shop_admin;
    if (!sa || sa.onboarding_completed_at) return;

    const exempt =
      pathname === "/admin" ||
      pathname === "/admin/profile" ||
      pathname === "/admin/onboarding" ||
      pathname.startsWith("/admin/onboarding/") ||
      pathname === "/admin/barbers" ||
      pathname.startsWith("/admin/barbers/") ||
      pathname === "/admin/services" ||
      pathname.startsWith("/admin/services/");

    if (exempt) {
      return;
    }
    router.replace("/admin/onboarding");
  }, [profile, pathname, router]);

  return <>{children}</>;
}
