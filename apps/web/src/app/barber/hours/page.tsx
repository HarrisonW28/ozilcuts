"use client";

import { ManageBarberHoursSection } from "@/components/manage-barber-hours-section";
import { SiteHeader } from "@/components/site-header";
import { useSessionProfile } from "@/lib/use-session-profile";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ScreenTitle,
} from "@ozilcuts/ui";
import Link from "next/link";

export default function BarberHoursPage() {
  const { profile, signOut } = useSessionProfile();

  const userId = profile.kind === "ready" ? profile.user.id : null;
  const isBarber =
    profile.kind === "ready" && profile.user.role.slug === "barber";

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main
        id="main-content"
        className="page-main"
      >
        <div className="mx-auto w-full max-w-3xl page-stack">
          <ScreenTitle
            eyebrow={OZILCUTS_APP_NAME}
            title="Weekly hours"
            description="Set when you accept bookings. Times use your shop’s local schedule (stored as simple start/end times)."
          />

          {profile.kind === "loading" || profile.kind === "none" ? (
            <p className="text-sm text-muted-foreground" role="status">
              Loading…
            </p>
          ) : null}

          {profile.kind === "error" ? (
            <p className="text-sm text-destructive" role="alert">
              Session issue. Sign in again.
            </p>
          ) : null}

          {profile.kind === "ready" && !isBarber ? (
            <Card>
              <CardHeader>
                <CardTitle>Barbers only</CardTitle>
                <CardDescription>
                  Sign in with a barber account to edit availability.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link href="/login">Sign in</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {isBarber && userId !== null ? (
            <ManageBarberHoursSection userId={userId} compactAddRemove={false} />
          ) : null}

          {isBarber ? (
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/" className="underline-offset-4 hover:underline">
                Home
              </Link>
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
