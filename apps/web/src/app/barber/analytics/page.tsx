"use client";

import { BarberAnalyticsView } from "@/components/barber-analytics-view";
import { PageSessionSkeleton } from "@/components/loading";
import { SiteHeader } from "@/components/site-header";
import { useSessionProfile } from "@/lib/use-session-profile";
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

export default function BarberAnalyticsPage() {
  const { profile, signOut } = useSessionProfile();

  const isBarber =
    profile.kind === "ready" && profile.user.role.slug === "barber";

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main
        id="main-content"
        className="page-main"
      >
        <div className="mx-auto w-full max-w-5xl page-stack">
          <ScreenTitle
            title="My analytics"
            description="Bookings, revenue, utilization, and your top services and customers."
          />

          {profile.kind === "loading" || profile.kind === "none" ? (
            <PageSessionSkeleton statusLabel="Loading" />
          ) : null}

          {profile.kind === "none" ? (
            <Card>
              <CardHeader>
                <CardTitle>Sign in required</CardTitle>
                <CardDescription>
                  Sign in with your barber account to see your analytics.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {profile.kind === "ready" && !isBarber ? (
            <Card>
              <CardHeader>
                <CardTitle>Barber accounts only</CardTitle>
                <CardDescription>
                  This page is for barbers. Admins can view per-barber
                  analytics from Admin → Barbers.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link href="/">Home</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {isBarber ? (
            <BarberAnalyticsView barberUserId={profile.user.id} />
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/" className="underline-offset-4 hover:underline">
              Home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
