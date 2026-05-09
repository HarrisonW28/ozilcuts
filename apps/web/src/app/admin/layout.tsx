"use client";

import { AdminOnboardingGate } from "@/components/admin-onboarding-gate";
import { QuickActionsLayer } from "@/components/quick-actions-layer";
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
          showDock &&
            "pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:pb-0",
        )}
      >
        {children}
        <QuickActionsLayer variant="admin" />
      </div>
    </AdminOnboardingGate>
  );
}
