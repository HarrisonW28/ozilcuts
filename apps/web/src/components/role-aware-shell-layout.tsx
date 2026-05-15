"use client";

import { ShellSectionLayout } from "@/components/shell-section-layout";
import type { AppShellNavVariant } from "@/lib/app-shell-nav";
import { useSessionProfile } from "@/lib/use-session-profile";
import type { ReactNode } from "react";

/**
 * Bottom tab shell for routes shared across roles (/appointments, /book, /notifications).
 */
export function RoleAwareShellLayout({ children }: { children: ReactNode }) {
  const { profile } = useSessionProfile();

  if (profile.kind !== "ready") {
    return <>{children}</>;
  }

  let variant: AppShellNavVariant | null = null;
  switch (profile.user.role.slug) {
    case "customer":
      variant = "customer";
      break;
    case "barber":
      variant = "barber";
      break;
    case "admin":
      variant = "admin";
      break;
    default:
      return <>{children}</>;
  }

  return (
    <ShellSectionLayout
      variant={variant}
      header={variant === "customer" ? "compact" : "none"}
    >
      {children}
    </ShellSectionLayout>
  );
}
