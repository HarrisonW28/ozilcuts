"use client";

import { getRoleSettingsHref } from "@/lib/dashboard-routes";
import { useSessionProfile } from "@/lib/use-session-profile";
import { ScreenTitle } from "@ozilcuts/ui";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardSettingsRedirectPage() {
  const { profile } = useSessionProfile();
  const router = useRouter();

  useEffect(() => {
    if (profile.kind === "loading") return;
    if (profile.kind !== "ready") {
      router.replace(
        `/login?next=${encodeURIComponent("/dashboard/settings")}`,
      );
      return;
    }
    const target = getRoleSettingsHref(profile);
    router.replace(target ?? "/profile");
  }, [profile, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        <ScreenTitle
          title="Settings"
          description="Opening settings for your account…"
        />
        <p className="text-sm text-muted-foreground" role="status" aria-busy="true">
          Loading…
        </p>
      </div>
    </div>
  );
}
