"use client";

import { AppShellRoutePrefetch } from "@/components/app-shell-route-prefetch";
import { ConnectivityProvider } from "@/lib/connectivity-provider";
import { ShopBrandingProvider } from "@/lib/shop-branding-context";
import { InboxProvider } from "@/lib/use-inbox";
import {
  SessionProfileProvider,
  useSessionProfile,
} from "@/lib/use-session-profile";
import type { PublicHomeMarketing } from "@ozilcuts/types";
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

type AppProvidersProps = {
  children: ReactNode;
  initialShopBranding?: PublicHomeMarketing | null;
};

export function AppProviders({
  children,
  initialShopBranding = null,
}: AppProvidersProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <ShopBrandingProvider initialBranding={initialShopBranding}>
        <SessionProfileProvider>
          <ConnectivityProvider>
            <InboxAndPrefetchShell>{children}</InboxAndPrefetchShell>
          </ConnectivityProvider>
        </SessionProfileProvider>
      </ShopBrandingProvider>
    </div>
  );
}
