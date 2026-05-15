import { ShellSectionLayout } from "@/components/shell-section-layout";
import type { ReactNode } from "react";

export default function ProfileSectionLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <ShellSectionLayout variant="customer" header="compact">
      {children}
    </ShellSectionLayout>
  );
}
