"use client";

import { NativeAppShell } from "@/components/native-app-shell";
import { ShellSectionSiteHeader } from "@/components/shell-section-site-header";
import type { AppShellNavVariant } from "@/lib/app-shell-nav";
import type { ReactNode } from "react";

type ShellSectionLayoutProps = {
  variant: AppShellNavVariant;
  children: ReactNode;
  header?: "compact" | "none";
  /** Marketing site header above shell content (tab routes still use bottom nav on mobile). */
  siteHeader?: boolean;
};

/** Section layout wrapper — pairs with `template.tsx` using `.app-shell-route`. */
export function ShellSectionLayout({
  variant,
  children,
  header = "none",
  siteHeader = false,
}: ShellSectionLayoutProps) {
  return (
    <NativeAppShell variant={variant} header={header}>
      {siteHeader ? <ShellSectionSiteHeader /> : null}
      {children}
    </NativeAppShell>
  );
}
