"use client";

import { CustomerHomeDashboard } from "@/components/customer-home-dashboard";
import { CustomerHomeSkeleton } from "@/components/load-empty";
import { useSessionProfile } from "@/lib/use-session-profile";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CustomerHomePage() {
  const { profile } = useSessionProfile();
  const router = useRouter();

  useEffect(() => {
    if (profile.kind === "loading") return;
    if (profile.kind === "error" || profile.kind === "none") {
      router.replace(`/login?next=${encodeURIComponent("/home")}`);
      return;
    }
    if (profile.user.role.slug !== "customer") {
      router.replace("/dashboard");
    }
  }, [profile, router]);

  const showDashboard =
    profile.kind === "ready" && profile.user.role.slug === "customer";

  return (
    <main id="main-content" className="page-main app-shell-scroll flex-1">
      {showDashboard ? (
        <CustomerHomeDashboard />
      ) : (
        <CustomerHomeSkeleton />
      )}
    </main>
  );
}
