import { ShellSectionLayout } from "@/components/shell-section-layout";
import type { ReactNode } from "react";

export default function BarberSectionLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <ShellSectionLayout variant="barber">{children}</ShellSectionLayout>;
}
