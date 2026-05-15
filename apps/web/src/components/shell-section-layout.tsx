"use client";

import { NativeAppShell } from "@/components/native-app-shell";
import type { AppShellNavVariant } from "@/lib/app-shell-nav";
import type { ReactNode } from "react";

type ShellSectionLayoutProps = {
  variant: AppShellNavVariant;
  children: ReactNode;
  header?: "compact" | "none";
};

/** Section layout wrapper — pairs with `template.tsx` using `.app-shell-route`. */
export function ShellSectionLayout({
  variant,
  children,
  header = "none",
}: ShellSectionLayoutProps) {
  return (
    <NativeAppShell variant={variant} header={header}>
      {children}
    </NativeAppShell>
  );
}
