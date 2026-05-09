"use client";

import { OperationalWorkspaceProvider } from "@/lib/operational-workspace-context";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <OperationalWorkspaceProvider>{children}</OperationalWorkspaceProvider>
  );
}
