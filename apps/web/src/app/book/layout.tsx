import { RoleAwareShellLayout } from "@/components/role-aware-shell-layout";
import type { ReactNode } from "react";

export default function BookSectionLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <RoleAwareShellLayout>{children}</RoleAwareShellLayout>;
}
