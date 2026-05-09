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
  cn,
} from "@ozilcuts/ui";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardList,
  Clock,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";

function SectionHeading({
  id,
  title,
  icon: Icon,
  description,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <h2
        id={id}
        className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/15">
          <Icon className="size-4" aria-hidden />
        </span>
        {title}
      </h2>
      {description ? (
        <p className="max-w-2xl pl-10 text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function HubCard({
  icon: Icon,
  title,
  description,
  href,
  cta,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  cta: string;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "h-full transition-[border-color,box-shadow] hover:border-primary/20 hover:shadow-sm dark:hover:border-primary/25",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
        <div
          className="shrink-0 rounded-xl bg-muted/80 p-2.5 text-foreground dark:bg-muted/50"
          aria-hidden
        >
          <Icon className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <CardTitle className="text-base leading-snug">{title}</CardTitle>
          <CardDescription className="text-pretty">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardFooter className="border-t border-border/40 pt-4">
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
          <Link href={href}>{cta}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

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
        <div className="mx-auto w-full max-w-5xl page-stack">
          <ScreenTitle
            eyebrow={OZILCUTS_APP_NAME}
            title="Dashboard"
            description="Chair, hours, stats, inbox, and appointments—everything for your side of the shop."
          />

          <section
            aria-labelledby="barber-work-heading"
            className="space-y-4 rounded-2xl border border-border/50 bg-card/30 p-4 shadow-sm sm:p-5 dark:bg-card/20"
          >
            <SectionHeading
              id="barber-work-heading"
              title="Workspace"
              icon={LayoutDashboard}
              description="Day-to-day tools behind the chair."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <HubCard
                icon={CalendarDays}
                title="Chair"
                description="Day timeline, walk-ins, and the week strip."
                href="/barber/calendar"
                cta="Open calendar"
              />
              <HubCard
                icon={Clock}
                title="Hours"
                description="When you accept online bookings."
                href="/barber/hours"
                cta="Manage hours"
              />
              <HubCard
                icon={BarChart3}
                title="Analytics"
                description="Booking volume and performance summary."
                href="/barber/analytics"
                cta="View stats"
                className="sm:col-span-2"
              />
            </div>
          </section>

          <section
            aria-labelledby="barber-ops-heading"
            className="space-y-4 rounded-2xl border border-border/50 bg-card/30 p-4 shadow-sm sm:p-5 dark:bg-card/20"
          >
            <SectionHeading
              id="barber-ops-heading"
              title="Bookings & inbox"
              icon={Bell}
              description="Your list and shop notifications."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <HubCard
                icon={ClipboardList}
                title="Appointments"
                description="Upcoming cuts, confirmations, and changes."
                href="/appointments"
                cta="View appointments"
              />
              <HubCard
                icon={Bell}
                title="Notifications"
                description="Alerts and nudges from the shop."
                href="/notifications"
                cta="Open inbox"
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
