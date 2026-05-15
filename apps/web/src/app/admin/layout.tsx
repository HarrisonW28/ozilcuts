import { AdminOnboardingGate } from "@/components/admin-onboarding-gate";
import { ShellSectionLayout } from "@/components/shell-section-layout";
import type { ReactNode } from "react";

export default function AdminSectionLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <AdminOnboardingGate>
      <ShellSectionLayout variant="admin">{children}</ShellSectionLayout>
    </AdminOnboardingGate>
  );
}
