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
  Activity,
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardList,
  LayoutGrid,
  ListChecks,
  RotateCcw,
  Sparkles,
  TrendingUp,
  User,
  UserCircle,
  Users,
} from "lucide-react";
import Link from "next/link";

const REPORT_LINKS = [
  {
    href: "/admin/reports/revenue",
    label: "Revenue",
    hint: "Income and pricing trends",
    icon: TrendingUp,
  },
  {
    href: "/admin/reports/barbers",
    label: "Compare barbers",
    hint: "Side-by-side performance",
    icon: Users,
  },
  {
    href: "/admin/reports/customers",
    label: "Customers",
    hint: "Segments and activity",
    icon: UserCircle,
  },
  {
    href: "/admin/reports/operations",
    label: "Operations",
    hint: "Load and utilization",
    icon: Activity,
  },
  {
    href: "/admin/reports/retention",
    label: "Retention",
    hint: "Who to win back",
    icon: RotateCcw,
  },
] as const;

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
        <div className="mx-auto w-full max-w-5xl page-stack">
          <ScreenTitle
            eyebrow={OZILCUTS_APP_NAME}
            title="Dashboard"
            description="Shop overview, catalog, team, reports, inbox, and appointments—your control room for the business."
          />

          {setupIncomplete ? (
            <Card className="border-primary/30 bg-primary/[0.06] dark:border-primary/35 dark:bg-primary/10">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-2">
                <div
                  className="shrink-0 rounded-xl bg-primary/15 p-2.5 text-primary dark:bg-primary/20"
                  aria-hidden
                >
                  <Sparkles className="size-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <CardTitle className="text-base">Finish shop setup</CardTitle>
                  <CardDescription>
                    Complete the checklist so services, hours, and team are
                    ready before you take live bookings.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardFooter className="gap-2 sm:flex sm:flex-wrap">
                <Button asChild>
                  <Link href="/admin/onboarding">Continue setup</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/services">Catalog</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/barbers">Team</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          <section
            aria-labelledby="admin-account-heading"
            className="space-y-4 rounded-2xl border border-border/50 bg-card/30 p-4 shadow-sm sm:p-5 dark:bg-card/20"
          >
            <SectionHeading
              id="admin-account-heading"
              title="Account"
              icon={User}
              description="Your admin login and shop connection."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <HubCard
                icon={User}
                title="Your profile"
                description="Account email, name, and shop display name (read-only summary)."
                href="/admin/profile"
                cta="Open profile"
              />
            </div>
          </section>

          <section
            aria-labelledby="admin-shop-heading"
            className="space-y-4 rounded-2xl border border-border/50 bg-card/30 p-4 shadow-sm sm:p-5 dark:bg-card/20"
          >
            <SectionHeading
              id="admin-shop-heading"
              title="Site settings"
              icon={LayoutGrid}
              description="What clients see online and who works the chair."
            />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <HubCard
                icon={LayoutGrid}
                title="Catalog & services"
                description="Services, prices, durations, deposits, and ordering."
                href="/admin/services"
                cta="Open catalog"
              />
              <HubCard
                icon={Users}
                title="Team & barbers"
                description="Staff accounts, hours, analytics, and per-barber tools."
                href="/admin/barbers"
                cta="Manage team"
              />
              <HubCard
                icon={ListChecks}
                title="Guided shop setup"
                description={
                  setupIncomplete
                    ? "Resume the onboarding checklist anytime."
                    : "Revisit steps to update services, hours, or team."
                }
                href="/admin/onboarding"
                cta={setupIncomplete ? "Resume checklist" : "Open checklist"}
                className="sm:col-span-2 xl:col-span-1"
              />
            </div>
          </section>

          <section
            aria-labelledby="admin-reports-heading"
            className="space-y-4 rounded-2xl border border-border/50 bg-card/30 p-4 shadow-sm sm:p-5 dark:bg-card/20"
          >
            <SectionHeading
              id="admin-reports-heading"
              title="Reports"
              icon={BarChart3}
              description="Read-only analytics—each report opens full detail."
            />
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {REPORT_LINKS.map((r) => (
                <li key={r.href} className="min-w-0">
                  <HubCard
                    icon={r.icon}
                    title={r.label}
                    description={r.hint}
                    href={r.href}
                    cta={`Open ${r.label}`}
                  />
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-labelledby="admin-ops-heading"
            className="space-y-4 rounded-2xl border border-border/50 bg-card/30 p-4 shadow-sm sm:p-5 dark:bg-card/20"
          >
            <SectionHeading
              id="admin-ops-heading"
              title="Bookings & inbox"
              icon={CalendarDays}
              description="Day-to-day appointment work and staff notifications."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <HubCard
                icon={ClipboardList}
                title="Appointments"
                description="Your shop’s booking list—confirm, reschedule, or follow up like a client view."
                href="/appointments"
                cta="View appointments"
              />
              <HubCard
                icon={Bell}
                title="Notifications"
                description="Inbox for shop and booking alerts—mark read and jump to context."
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
