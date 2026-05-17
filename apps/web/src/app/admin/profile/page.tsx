"use client";

import { SiteHeader } from "@/components/site-header";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  ScreenTitle,
} from "@ozilcuts/ui";
import Link from "next/link";

export default function AdminProfilePage() {
  const { profile, signOut } = useSessionProfile();

  const isAdmin =
    profile.kind === "ready" && profile.user.role.slug === "admin";
  const sa = profile.kind === "ready" ? profile.user.shop_admin : undefined;

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
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            This page is for shop administrators.
          </p>
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
            title="Your profile"
            description="Account details for this admin login. Shop branding and policies are managed from the shop dashboard and setup checklist."
          />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Account</CardTitle>
              <CardDescription>
                Name and email are tied to your sign-in. To change them, contact
                support or use your auth provider’s account settings where applicable.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col items-stretch gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="admin-name">Name</Label>
                <Input
                  id="admin-name"
                  value={profile.user.name}
                  disabled
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={profile.user.email}
                  disabled
                />
              </div>
            </CardFooter>
          </Card>

          {sa ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Shop</CardTitle>
                <CardDescription>
                  Display name and onboarding status for your connected shop.
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-col items-stretch gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="shop-display">Shop display name</Label>
                  <Input
                    id="shop-display"
                    value={sa.shop_display_name ?? "—"}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Update from the guided setup checklist or onboarding flow.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/admin">Shop dashboard</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/admin/onboarding">Shop setup</Link>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/admin" className="underline-offset-4 hover:underline">
              Back to dashboard
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
