"use client";

import { getRoleDashboardHref } from "@/lib/dashboard-routes";
import { useSessionProfile } from "@/lib/use-session-profile";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import { ScreenTitle } from "@ozilcuts/ui";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardRedirectPage() {
  const { profile } = useSessionProfile();
  const router = useRouter();

  useEffect(() => {
    if (profile.kind === "loading") return;
    if (profile.kind !== "ready") {
      router.replace(`/login?next=${encodeURIComponent("/dashboard")}`);
      return;
    }
    const target = getRoleDashboardHref(profile);
    router.replace(target ?? "/");
  }, [profile, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        <ScreenTitle
          eyebrow={OZILCUTS_APP_NAME}
          title="Dashboard"
          description="Taking you to your workspace…"
        />
        <p className="text-sm text-muted-foreground" role="status" aria-busy="true">
          Loading…
        </p>
      </div>
    </div>
  );
}
