import { RoleAwareShellLayout } from "@/components/role-aware-shell-layout";
import type { ReactNode } from "react";

export default function NotificationsSectionLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <RoleAwareShellLayout>{children}</RoleAwareShellLayout>;
}
