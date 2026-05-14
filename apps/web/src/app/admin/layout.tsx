"use client";

import { AdminOnboardingGate } from "@/components/admin-onboarding-gate";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { useSessionProfile } from "@/lib/use-session-profile";
import { cn } from "@ozilcuts/ui";
import type { ReactNode } from "react";

export default function AdminSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile } = useSessionProfile();
  const showDock =
    profile.kind === "ready" && profile.user.role.slug === "admin";

  return (
    <AdminOnboardingGate>
      <div
        className={cn(
          "flex min-h-dvh flex-1 flex-col",
          showDock && "app-shell-with-bottom-nav",
        )}
      >
        {children}
        <AppBottomNav variant="admin" />
      </div>
    </AdminOnboardingGate>
  );
}
