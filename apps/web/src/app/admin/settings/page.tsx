"use client";

import { AdminShopSettingsPanel } from "@/components/admin/admin-shop-settings-panel";
import { SiteHeader } from "@/components/site-header";
import { refreshPublicShopBranding } from "@/lib/use-public-shop-branding";
import { useSessionProfile } from "@/lib/use-session-profile";
import { Button, ScreenTitle } from "@ozilcuts/ui";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import Link from "next/link";

export default function AdminShopSettingsPage() {
  const { profile, signOut, refreshProfile } = useSessionProfile();

  const isAdmin =
    profile.kind === "ready" && profile.user.role.slug === "admin";
  const sa = profile.kind === "ready" ? profile.user.shop_admin : undefined;

  const handleUpdated = () => {
    refreshPublicShopBranding();
    void refreshProfile();
  };

  if (profile.kind === "loading" || profile.kind === "none") {
    return (
      <div className="flex min-h-dvh flex-1 flex-col">
        <SiteHeader profile={profile} onSignOut={signOut} />
        <main id="main-content" className="page-main">
          <p className="text-sm text-muted-foreground" role="status">
            Loading…
          </p>
        </main>
      </div>
    );
  }

  if (profile.kind === "error") {
    return (
      <div className="flex min-h-dvh flex-1 flex-col">
        <SiteHeader profile={profile} onSignOut={signOut} />
        <main
          id="main-content"
          className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10"
        >
          <p className="text-sm text-muted-foreground">Session issue.</p>
          <Button asChild variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-dvh flex-1 flex-col">
        <SiteHeader profile={profile} onSignOut={signOut} />
        <main
          id="main-content"
          className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10"
        >
          <p className="text-sm text-muted-foreground">Admin access required.</p>
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main id="main-content" className="page-main">
        <div className="mx-auto w-full max-w-2xl page-stack">
          <ScreenTitle
            eyebrow={OZILCUTS_APP_NAME}
            title="Shop settings"
            description="Logo, homepage hero video, and other client-facing branding for your shop."
          />

          <AdminShopSettingsPanel
            hasLogo={Boolean(sa?.shop_logo_path)}
            hasHeroVideo={Boolean(sa?.shop_hero_video_path)}
            hasHeroPoster={Boolean(sa?.shop_hero_poster_path)}
            onUpdated={handleUpdated}
          />

          <p className="text-sm text-muted-foreground">
            <Link href="/admin" className="underline-offset-4 hover:underline">
              ← Back to dashboard
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
