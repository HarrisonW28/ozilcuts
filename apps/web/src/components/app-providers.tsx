"use client";

import { InboxProvider } from "@/lib/use-inbox";
import { useSessionProfile } from "@/lib/use-session-profile";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  const { profile } = useSessionProfile();
  const inboxEnabled = profile.kind === "ready";

  return <InboxProvider enabled={inboxEnabled}>{children}</InboxProvider>;
}
