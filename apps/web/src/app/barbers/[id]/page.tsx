"use client";

import { SiteHeader } from "@/components/site-header";
import { WeekAvailabilityCalendar } from "@/components/week-availability-calendar";
import {
  buildWeekDaysFromAvailability,
  formatWeekRangeLabel,
  startOfWeekSunday,
} from "@/lib/calendar-week";
import {
  ozilcutsPageEnterInitial,
  ozilcutsPageEnterTransition,
} from "@/lib/motion";
import { useSessionProfile } from "@/lib/use-session-profile";
import { ApiError, fetchBarber, fetchBarberAvailability } from "@ozilcuts/api";
import { Button, Skeleton } from "@ozilcuts/ui";
import type {
  BarberAvailabilityPayload,
  BarberProfilePublic,
} from "@ozilcuts/types";
import { BARBER_WEEKDAY_LABELS } from "@ozilcuts/types";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type DetailState =
  | { kind: "loading" }
  | {
      kind: "ok";
      profile: BarberProfilePublic;
      availability: BarberAvailabilityPayload | null;
    }
  | { kind: "error"; message: string; notFound?: boolean };

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${
    parts[parts.length - 1]?.[0] ?? ""
  }`.toUpperCase();
}

export default function BarberDetailPage() {
  const params = useParams();
  const idParam = params.id;
  const userId =
    typeof idParam === "string"
      ? Number.parseInt(idParam, 10)
      : Array.isArray(idParam)
        ? Number.parseInt(idParam[0] ?? "", 10)
        : NaN;

  const { profile, signOut } = useSessionProfile();
  const reduceMotion = useReducedMotion();
  const [state, setState] = useState<DetailState>({ kind: "loading" });

  const load = useCallback(
    (isCancelled: () => boolean) => {
      if (!Number.isFinite(userId) || userId < 1) {
        setState({
          kind: "error",
          message: "Invalid barber link.",
        });

        return;
      }
      setState({ kind: "loading" });
      Promise.all([
        fetchBarber(userId),
        fetchBarberAvailability(userId).catch(() => null),
      ])
        .then(([row, availability]) => {
          if (isCancelled()) return;
          setState({ kind: "ok", profile: row, availability });
        })
        .catch((err: unknown) => {
          if (isCancelled()) return;
          if (err instanceof ApiError && err.status === 404) {
            setState({
              kind: "error",
              message: "This barber profile could not be found.",
              notFound: true,
            });

            return;
          }
          const message =
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Unable to load profile.";
          setState({ kind: "error", message });
        });
    },
    [userId],
  );

  useEffect(() => {
    let cancelled = false;
    load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  const retry = useCallback(() => {
    load(() => false);
  }, [load]);

  const publicWeekStart = useMemo(() => startOfWeekSunday(new Date()), []);
  const publicWeekLabel = formatWeekRangeLabel(publicWeekStart);
  const publicCalendarDays = useMemo(
    () =>
      buildWeekDaysFromAvailability(
        publicWeekStart,
        state.kind === "ok" ? state.availability : null,
      ),
    [publicWeekStart, state],
  );

  const motionInitial = ozilcutsPageEnterInitial(reduceMotion);

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main
        id="main-content"
        className="page-main"
      >
        <motion.div
          initial={motionInitial}
          animate={{ opacity: 1, y: 0 }}
          transition={ozilcutsPageEnterTransition}
          className="mx-auto w-full max-w-5xl page-stack"
        >
          {state.kind === "loading" ? (
            <div className="space-y-12 md:space-y-14" role="status" aria-live="polite">
              <span className="sr-only">Loading profile…</span>
              <div
                className="flex flex-col gap-8 border-b border-border/40 pb-10 dark:border-border/35 sm:flex-row sm:items-end sm:gap-10"
                aria-hidden
              >
                <Skeleton className="size-20 shrink-0 rounded-2xl sm:size-24" />
                <div className="min-w-0 flex-1 space-y-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-11 w-full max-w-sm" />
                  <Skeleton className="h-4 w-full max-w-md" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <div className="grid gap-10 md:grid-cols-[1fr,min(100%,15rem)]">
                <div className="space-y-3" aria-hidden>
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                </div>
                <Skeleton className="h-48 rounded-2xl md:h-auto md:min-h-[12rem]" />
              </div>
              <div className="space-y-4 border-t border-border/40 pt-10 dark:border-border/35" aria-hidden>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-40 w-full rounded-xl" />
              </div>
            </div>
          ) : null}

          {state.kind === "error" ? (
            <div
              className="flex flex-col gap-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"
              role="alert"
            >
              <p className="text-sm text-destructive">{state.message}</p>
              <div className="flex flex-wrap gap-2">
                {state.notFound ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/barbers">All barbers</Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={retry}
                  >
                    Retry
                  </Button>
                )}
              </div>
            </div>
          ) : null}

          {state.kind === "ok" ? (
            <div className="space-y-12 md:space-y-14 lg:space-y-16">
              <header className="border-b border-border/45 pb-10 dark:border-border/35">
                <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
                  <div className="flex items-start gap-5 sm:gap-7">
                    <div
                      className="flex size-[4.5rem] shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-gradient-to-br from-muted/65 to-muted/25 text-[1.35rem] font-semibold tabular-nums tracking-tight text-foreground/90 shadow-xs dark:from-muted/40 dark:to-muted/15 sm:size-24 sm:text-2xl"
                      aria-hidden
                    >
                      {initialsFromName(state.profile.barber.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Barber
                      </p>
                      <h1 className="mt-3 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-foreground sm:mt-4 sm:text-4xl sm:leading-[1.06] md:text-5xl">
                        {state.profile.barber.name}
                      </h1>
                      {state.profile.title ? (
                        <p className="mt-3 max-w-2xl text-pretty text-base leading-snug text-muted-foreground sm:mt-4 sm:text-lg">
                          {state.profile.title}
                        </p>
                      ) : null}
                      {state.profile.years_experience !== null ? (
                        <p className="mt-4">
                          <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/35 px-3 py-1 text-xs font-semibold text-foreground dark:bg-muted/25">
                            {state.profile.years_experience} years experience
                          </span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </header>

              <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_min(100%,15rem)] md:items-start md:gap-10 lg:grid-cols-[minmax(0,1fr)_min(100%,17.5rem)] lg:gap-16">
                <div className="space-y-4 md:space-y-5">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    About
                  </h2>
                  {state.profile.bio ? (
                    <p className="whitespace-pre-wrap text-base leading-[1.75] text-muted-foreground sm:text-[1.0625rem]">
                      {state.profile.bio}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Bio coming soon.
                    </p>
                  )}
                </div>
                <aside className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-muted/[0.06] p-5 shadow-sm dark:bg-muted/[0.04] lg:sticky lg:top-[max(5.5rem,env(safe-area-inset-top,0px)+4.5rem)] lg:self-start">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 w-full text-base shadow-sm sm:h-[3.25rem]"
                  >
                    <Link href={`/book?barber_user_id=${userId}`}>Book now</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-11 w-full sm:h-12"
                  >
                    <Link href={`/barbers/${userId}/portfolio`}>
                      View portfolio
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="h-11 w-full">
                    <Link href="/barbers">All barbers</Link>
                  </Button>
                </aside>
              </div>

              <section
                className="space-y-6 border-t border-border/45 pt-10 dark:border-border/35 md:pt-12"
                aria-labelledby="barber-availability-heading"
              >
                <div>
                  <h2
                    id="barber-availability-heading"
                    className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
                  >
                    Availability
                  </h2>
                  <p className="mt-1 max-w-xl text-sm leading-snug text-muted-foreground">
                    Published hours and this week at a glance.
                  </p>
                </div>
                {state.availability && state.availability.weekdays.length > 0 ? (
                  <>
                    <ul className="space-y-4 text-sm text-muted-foreground">
                      {state.availability.weekdays.map((day) => (
                        <li key={day.weekday}>
                          <span className="font-medium text-foreground">
                            {BARBER_WEEKDAY_LABELS[day.weekday] ??
                              `Day ${day.weekday}`}
                          </span>
                          <ul className="mt-2 list-inside list-disc space-y-1">
                            {day.windows.map((w) => (
                              <li
                                key={`${day.weekday}-${w.starts_at}-${w.ends_at}`}
                              >
                                {w.starts_at} – {w.ends_at}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-foreground">
                        This week
                      </h3>
                      <WeekAvailabilityCalendar
                        weekLabel={publicWeekLabel}
                        days={publicCalendarDays}
                        className="dashboard-surface rounded-xl p-3 sm:p-4"
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Published hours are not available for this barber yet.
                  </p>
                )}
              </section>
            </div>
          ) : null}

          {state.kind !== "loading" ? (
            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/barbers"
                className="underline-offset-4 hover:underline"
              >
                Back to all barbers
              </Link>
            </p>
          ) : null}
        </motion.div>
      </main>
    </div>
  );
}
