"use client";

import { AdminShopSettingsPanel } from "@/components/admin/admin-shop-settings-panel";
import { AdminShopVisitPanel } from "@/components/admin/admin-shop-visit-panel";
import { SiteHeader } from "@/components/site-header";
import { refreshPublicShopBranding } from "@/lib/use-public-shop-branding";
import { useSessionProfile } from "@/lib/use-session-profile";
import { Button, ScreenTitle } from "@ozilcuts/ui";
import { Store } from "lucide-react";
import Link from "next/link";

export default function AdminSiteSettingsPage() {
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
        <div className="mx-auto w-full max-w-5xl page-stack">
          <ScreenTitle
            title="Site settings"
            description="Logo, homepage look, and Instagram — what guests see before they book. Catalog and hours live on the dashboard."
          />

          <section
            aria-labelledby="site-settings-branding-heading"
            className="space-y-4 rounded-2xl border border-border/50 bg-card/30 p-4 shadow-sm sm:p-5 dark:bg-card/20"
          >
            <div className="space-y-1">
              <h2
                id="site-settings-branding-heading"
                className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/15">
                  <Store className="size-4" aria-hidden />
                </span>
                Branding & homepage
              </h2>
              <p className="max-w-2xl pl-10 text-sm text-muted-foreground">
                Logo, Instagram handle, and full-width hero video on the landing page.
              </p>
            </div>

            <AdminShopSettingsPanel
              hasLogo={Boolean(sa?.shop_logo_path)}
              hasHeroVideoDesktop={Boolean(sa?.shop_hero_video_path)}
              hasHeroVideoMobile={Boolean(sa?.shop_hero_video_mobile_path)}
              hasHeroPosterDesktop={Boolean(sa?.shop_hero_poster_path)}
              hasHeroPosterMobile={Boolean(sa?.shop_hero_poster_mobile_path)}
              instagramHandle={sa?.shop_instagram_handle ?? null}
              onUpdated={handleUpdated}
            />
          </section>

          {sa ? (
            <AdminShopVisitPanel shopAdmin={sa} onUpdated={handleUpdated} />
          ) : null}

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
