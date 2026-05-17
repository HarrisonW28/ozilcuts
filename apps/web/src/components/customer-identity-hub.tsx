"use client";

import {
  buildBookFromAppointmentRow,
  buildFavouriteBarberBookHref,
} from "@/lib/booking-url";
import { readRememberedBooking } from "@/lib/booking-remembered-preferences";
import { VISIT_MILESTONES } from "@/lib/customer-home";
import {
  computeMonthlyVisitStreak,
  loyaltyProgressFromVisits,
  loyaltyTierCopy,
  sortHistoryVisually,
} from "@/lib/customer-identity";
import { formatGbp } from "@/lib/format-gbp";
import type {
  CustomerAnalyticsResponse,
  CustomerProfile,
  HairProfile,
} from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cn,
} from "@ozilcuts/ui";
import {
  CalendarHeart,
  Camera,
  Flame,
  Heart,
  Scissors,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

function formatVisitWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export type CustomerIdentityHubProps = {
  firstName: string;
  visits: CustomerAnalyticsResponse;
  customerProfile: CustomerProfile;
  hairProfile: HairProfile | null;
};

export function CustomerIdentityHub({
  firstName,
  visits,
  customerProfile,
  hairProfile,
}: CustomerIdentityHubProps) {
  const summary = visits.summary;
  const streak = useMemo(
    () => computeMonthlyVisitStreak(visits.history),
    [visits.history],
  );
  const tier = loyaltyTierCopy(summary.total_visits);
  const loyalty = loyaltyProgressFromVisits(summary.total_visits);
  const sortedHistory = useMemo(
    () => sortHistoryVisually(visits.history),
    [visits.history],
  );
  const nowMs = Date.now();
  const timelinePreview = useMemo(() => {
    return sortedHistory.filter(
      (r) =>
        r.status === "confirmed" &&
        r.starts_at !== null &&
        new Date(r.starts_at).getTime() <= nowMs,
    );
  }, [sortedHistory, nowMs]);
  const previewRows = timelinePreview.slice(0, 5);

  const preferredId = customerProfile.preferred_barber_user_id;
  const preferredName =
    customerProfile.preferred_barber?.name ??
    summary.preferred_barber?.name ??
    null;
  const preferredMatchesVisits =
    preferredId !== null && summary.preferred_barber?.user_id === preferredId;

  const remembered = useMemo(() => readRememberedBooking(), []);
  const favouriteHref =
    preferredId !== null
      ? buildFavouriteBarberBookHref(preferredId, remembered)
      : null;

  const streakBody =
    streak.currentStreakMonths < 1
      ? "Visit in a new calendar month to start a streak — each month with a confirmed cut extends your run."
      : streak.currentStreakMonths === 1
        ? "You've got one solid month on the board. Keep it rolling."
        : `${streak.currentStreakMonths} months in a row with at least one visit. That kind of consistency shows.`;

  const galleryPhotos = (hairProfile?.photos ?? []).slice(0, 6);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <section
        aria-label="Your studio identity"
        className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/12 via-background to-background p-6 shadow-md dark:from-primary/18 dark:via-background dark:to-background sm:p-8"
      >
        <div className="relative z-[1] max-w-2xl space-y-3">
          <p className="text-micro font-semibold uppercase tracking-wide text-primary">
            Your studio story
          </p>
          <h2 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {firstName ? (
              <>
                {firstName}, this chair knows you
                <span className="text-primary">.</span>
              </>
            ) : (
              <>
                This chair knows you<span className="text-primary">.</span>
              </>
            )}
          </h2>
          <p className="text-pretty text-sm leading-relaxed text-foreground/85 sm:text-base">
            Loyalty, streaks, and the cuts you&apos;ve shared — in one place.
            Come back when you need a reminder of how far you&apos;ve come.
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        <Card
          size="sm"
          className="dashboard-surface motion-card lg:col-span-2"
        >
          <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
              <Sparkles className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-lg">{tier.title}</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {tier.description}
              </CardDescription>
            </div>
          </CardHeader>
          {loyalty ? (
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{loyalty.totalVisits} confirmed visits</span>
                {loyalty.next !== null ? (
                  <span>
                    Next milestone:{" "}
                    <span className="font-medium text-foreground">
                      {loyalty.next} visits
                    </span>
                  </span>
                ) : (
                  <span className="font-medium text-foreground">
                    All milestones reached
                  </span>
                )}
              </div>
              <div
                className="relative h-3 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={loyalty.pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progress toward next visit milestone"
              >
                <div
                  className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-out"
                  style={{ width: `${loyalty.pct}%` }}
                />
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 right-0 flex justify-between px-0.5"
                  aria-hidden
                >
                  {VISIT_MILESTONES.map((m) => {
                    const reached = loyalty.totalVisits >= m;
                    return (
                      <span
                        key={m}
                        className={cn(
                          "mt-0.5 size-2 rounded-full border border-background",
                          reached ? "bg-primary" : "bg-muted-foreground/35",
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            </CardContent>
          ) : (
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your first finished visit unlocks milestones and progress
                tracking.
              </p>
            </CardContent>
          )}
        </Card>

        <Card size="sm" className="dashboard-surface motion-card">
          <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-200">
              <Flame className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-lg">Visit streak</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {streakBody}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-3xl font-semibold tabular-nums text-foreground">
              {streak.currentStreakMonths}
              <span className="text-lg font-medium text-muted-foreground">
                {" "}
                mo
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Best run · {streak.bestStreakMonths} month
              {streak.bestStreakMonths === 1 ? "" : "s"} · Active across{" "}
              {streak.uniqueActiveMonths} different month
              {streak.uniqueActiveMonths === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <Card size="sm" className="dashboard-surface h-full motion-card">
          <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/55 bg-muted/25 text-foreground">
              <Heart className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-lg">Favourite barber</CardTitle>
              <CardDescription>
                {preferredName ? (
                  <>
                    {preferredMatchesVisits || !summary.preferred_barber ? (
                      <span>
                        Your profile points to{" "}
                        <span className="font-medium text-foreground">
                          {preferredName}
                        </span>
                        .
                      </span>
                    ) : (
                      <span>
                        Profile favourite{" "}
                        <span className="font-medium text-foreground">
                          {preferredName}
                        </span>{" "}
                        · Most visits with{" "}
                        <span className="font-medium text-foreground">
                          {summary.preferred_barber.name}
                        </span>
                        .
                      </span>
                    )}
                  </>
                ) : (
                  "Choose someone you connect with — it fast-tracks booking and makes every visit warmer."
                )}
              </CardDescription>
            </div>
          </CardHeader>
          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:flex-wrap pt-0">
            {preferredId !== null ? (
              <Button
                asChild
                className="min-h-11 w-full touch-manipulation sm:w-auto"
              >
                <Link href={`/barbers/${preferredId}`}>View profile</Link>
              </Button>
            ) : null}
            {favouriteHref ? (
              <Button
                asChild
                variant="outline"
                className="min-h-11 w-full touch-manipulation sm:w-auto"
              >
                <Link href={favouriteHref}>Book with them</Link>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="min-h-11 w-full touch-manipulation sm:w-auto"
              >
                <Link href="/book">Find a barber</Link>
              </Button>
            )}
            <Button
              asChild
              variant="ghost"
              className="min-h-11 w-full touch-manipulation sm:w-auto"
            >
              <Link href="/profile">Set favourite in account</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card size="sm" className="dashboard-surface h-full motion-card">
          <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/55 bg-muted/25 text-foreground">
              <Camera className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <CardTitle className="text-lg">Personal gallery</CardTitle>
              <CardDescription>
                Reference photos you&apos;ve shared — your barber sees these on
                booking.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {galleryPhotos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No photos yet. Add cuts you love so your next visit starts with
                a shared visual language.
              </p>
            ) : (
              <ul
                className="grid grid-cols-3 gap-2 sm:grid-cols-3"
                role="list"
                aria-label="Hair profile photo previews"
              >
                {galleryPhotos.map((photo) => (
                  <li
                    key={photo.id}
                    className="relative aspect-square overflow-hidden rounded-lg border border-border/50 bg-muted/30"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- API-hosted customer photos */}
                    <img
                      src={photo.url}
                      alt={photo.caption ?? "Your hair reference"}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
          <CardFooter className="pt-0">
            <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
              <Link href="/profile/hair">Manage hair profile</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card size="sm" className="dashboard-surface motion-card">
        <CardHeader className="flex flex-row flex-wrap items-start gap-3 space-y-0 pb-2">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/55 bg-muted/25 text-foreground">
            <CalendarHeart className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="text-lg">Haircut timeline</CardTitle>
            <CardDescription>
              A condensed thread of your past cuts, newest first.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {previewRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              When you complete visits, they land here — a quiet record of how
              you show up for yourself.
            </p>
          ) : (
            <ul className="space-y-3" role="list">
              {previewRows.map((row) => {
                const href = buildBookFromAppointmentRow(row);
                return (
                  <li key={row.id} role="listitem">
                    <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/45 bg-background/80">
                          <Scissors className="size-4 text-primary" aria-hidden />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm font-semibold text-foreground">
                            {row.service?.name ?? "Appointment"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatVisitWhen(row.starts_at)}
                            {row.barber?.name
                              ? ` · ${row.barber.name}`
                              : ""}
                          </p>
                          {row.amount_paid_cents > 0 ? (
                            <p className="text-xs font-medium tabular-nums text-foreground/90">
                              {formatGbp(row.amount_paid_cents)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="min-h-10 touch-manipulation"
                        >
                          <Link href={`/appointments/${row.id}/confirmation`}>
                            Details
                          </Link>
                        </Button>
                        {href ? (
                          <Button
                            asChild
                            size="sm"
                            className="min-h-10 touch-manipulation"
                          >
                            <Link href={href}>Book similar</Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
        <CardFooter className="border-t border-border/35">
          <Button asChild variant="secondary" className="min-h-11 w-full sm:w-auto">
            <Link href="/profile/visits">Open full visit history</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
