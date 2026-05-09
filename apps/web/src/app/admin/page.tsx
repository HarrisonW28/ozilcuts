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

const REPORT_LINKS = [
  { href: "/admin/reports/revenue", label: "Revenue", hint: "Income and pricing trends" },
  { href: "/admin/reports/barbers", label: "Compare barbers", hint: "Side-by-side performance" },
  { href: "/admin/reports/customers", label: "Customers", hint: "Segments and activity" },
  { href: "/admin/reports/operations", label: "Operations", hint: "Load and utilization" },
  { href: "/admin/reports/retention", label: "Retention", hint: "Who to win back" },
] as const;

export default function AdminDashboardPage() {
  const { profile, signOut } = useSessionProfile();

  const isAdmin =
    profile.kind === "ready" && profile.user.role.slug === "admin";
  const sa = profile.kind === "ready" ? profile.user.shop_admin : undefined;
  const setupIncomplete = Boolean(
    isAdmin && sa && !sa.onboarding_completed_at,
  );

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

  if (!isAdmin) {
    return (
      <div className="flex min-h-dvh flex-1 flex-col">
        <SiteHeader profile={profile} onSignOut={signOut} />
        <main
          id="main-content"
          className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10"
        >
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            This dashboard is for shop administrators.
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
            title="Shop dashboard"
            description="Configure your shop, review reports, and jump to day-to-day booking tools."
          />

          {setupIncomplete ? (
            <Card className="border-primary/25 bg-primary/5 dark:bg-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Shop setup</CardTitle>
                <CardDescription>
                  Finish the short checklist so hours, services, and team are
                  ready for clients.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild>
                  <Link href="/admin/onboarding">Continue setup</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          <section aria-labelledby="admin-shop-heading" className="space-y-3">
            <h2 id="admin-shop-heading" className="text-sm font-semibold text-foreground">
              Your shop
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Catalog</CardTitle>
                  <CardDescription>
                    Services, prices, durations, deposits.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button asChild variant="outline">
                    <Link href="/admin/services">Open catalog</Link>
                  </Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Team</CardTitle>
                  <CardDescription>
                    Barber accounts, hours, and analytics.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button asChild variant="outline">
                    <Link href="/admin/barbers">Manage team</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </section>

          <section aria-labelledby="admin-reports-heading" className="space-y-3">
            <h2 id="admin-reports-heading" className="text-sm font-semibold text-foreground">
              Reports
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {REPORT_LINKS.map((r) => (
                <li key={r.href}>
                  <Card className="h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{r.label}</CardTitle>
                      <CardDescription>{r.hint}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button asChild variant="outline" size="sm">
                        <Link href={r.href}>Open</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </li>
              ))}
            </ul>
          </section>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Bookings</CardTitle>
              <CardDescription>
                Same appointment list you use as a customer—filter and manage
                from one place.
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
