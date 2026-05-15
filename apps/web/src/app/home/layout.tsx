import { ShellSectionLayout } from "@/components/shell-section-layout";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Home",
  description: "Your next visit, loyalty, and studio shortcuts.",
};

export default function CustomerHomeLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <ShellSectionLayout variant="customer" header="compact">
      {children}
    </ShellSectionLayout>
  );
}
