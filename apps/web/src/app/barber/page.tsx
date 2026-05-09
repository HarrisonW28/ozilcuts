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
  ScreenTitle,
} from "@ozilcuts/ui";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import Link from "next/link";

export default function BarberDashboardPage() {
  const { profile, signOut } = useSessionProfile();

  const isBarber =
    profile.kind === "ready" && profile.user.role.slug === "barber";

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
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t load your account.
          </p>
          <Button asChild variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </main>
      </div>
    );
  }

  if (!isBarber) {
    return (
      <div className="flex min-h-dvh flex-1 flex-col">
        <SiteHeader profile={profile} onSignOut={signOut} />
        <main
          id="main-content"
          className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10"
        >
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            This dashboard is for barbers.
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
        <div className="mx-auto w-full max-w-3xl page-stack">
          <ScreenTitle
            eyebrow={OZILCUTS_APP_NAME}
            title="Dashboard"
            description="Your chair, hours, and stats—everything for a day behind the bench."
          />

          <section aria-labelledby="barber-work-heading" className="space-y-3">
            <h2
              id="barber-work-heading"
              className="text-sm font-semibold text-foreground"
            >
              Workspace
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Chair</CardTitle>
                  <CardDescription>
                    Day timeline, walk-ins, and the week strip.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button asChild variant="outline">
                    <Link href="/barber/calendar">Open calendar</Link>
                  </Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Hours</CardTitle>
                  <CardDescription>
                    When you accept online bookings.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button asChild variant="outline">
                    <Link href="/barber/hours">Manage hours</Link>
                  </Button>
                </CardFooter>
              </Card>
              <Card className="sm:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Analytics</CardTitle>
                  <CardDescription>
                    Booking and performance summary.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button asChild variant="outline">
                    <Link href="/barber/analytics">View stats</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </section>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Bookings</CardTitle>
              <CardDescription>
                Your appointments list and confirmations.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild variant="outline">
                <Link href="/appointments">My appointments</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
