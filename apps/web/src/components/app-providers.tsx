"use client";

import { OperationalWorkspaceProvider } from "@/lib/operational-workspace-context";
import { InboxProvider } from "@/lib/use-inbox";
import { useSessionProfile } from "@/lib/use-session-profile";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  const { profile } = useSessionProfile();
  const inboxEnabled = profile.kind === "ready";

  return (
    <OperationalWorkspaceProvider>
      <InboxProvider enabled={inboxEnabled}>{children}</InboxProvider>
    </OperationalWorkspaceProvider>
  );
}
