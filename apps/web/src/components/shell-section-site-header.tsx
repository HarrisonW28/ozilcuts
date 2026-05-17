"use client";

import { SiteHeader } from "@/components/site-header";
import { useSessionProfile } from "@/lib/use-session-profile";

/** Site chrome for native shell sections (logo, account, notifications; drawer hidden on tab routes). */
export function ShellSectionSiteHeader() {
  const { profile, signOut } = useSessionProfile();
  return <SiteHeader profile={profile} onSignOut={signOut} />;
}
