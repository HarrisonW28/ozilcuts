"use client";

import { AppShellRoutePrefetch } from "@/components/app-shell-route-prefetch";
import { ConnectivityProvider } from "@/lib/connectivity-provider";
import { InboxProvider } from "@/lib/use-inbox";
import {
  SessionProfileProvider,
  useSessionProfile,
} from "@/lib/use-session-profile";
import type { ReactNode } from "react";

function InboxAndPrefetchShell({ children }: { children: ReactNode }) {
  const { profile } = useSessionProfile();
  const inboxEnabled = profile.kind === "ready";

  return (
    <InboxProvider enabled={inboxEnabled}>
      <AppShellRoutePrefetch />
      {children}
    </InboxProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <SessionProfileProvider>
        <ConnectivityProvider>
          <InboxAndPrefetchShell>{children}</InboxAndPrefetchShell>
        </ConnectivityProvider>
      </SessionProfileProvider>
    </div>
  );
}
