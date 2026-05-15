"use client";

import { OperationalStatusChip } from "@/components/operational-status-chip";
import { ShopLiveStatusBanner } from "@/components/shop-live-status-banner";
import {
  formatMonthDay,
  formatShortWeekday,
  formatYmd,
  isSameYmd,
} from "@/lib/calendar-week";
import { formatGbp } from "@/lib/format-gbp";
import {
  buildLiveShopSummary,
  deriveOperationalStatus,
  findServingAppointment,
  minutesUntilStart,
  sortTodayConfirmedQueue,
} from "@/lib/shop-live-status";
import type { AppointmentRecord } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  cn,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0 min";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function appointmentEndMs(a: AppointmentRecord): number | null {
  if (a.ends_at) {
    const t = new Date(a.ends_at).getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (!a.starts_at) return null;
  const start = new Date(a.starts_at).getTime();
  if (Number.isNaN(start)) return null;
  const durMin = a.service?.duration_minutes ?? 0;
  return start + durMin * 60_000;
}

function minutesRemainingInVisit(
  a: AppointmentRecord,
  nowMs: number,
): number | null {
  const end = appointmentEndMs(a);
  if (end === null) return null;
  const left = Math.ceil((end - nowMs) / 60_000);
  return left > 0 ? left : null;
}

export type BarberDailyOverviewProps = {
  /** Calendar day in local time (midnight-aligned). */
  day: Date;
  appointments: AppointmentRecord[];
  className?: string;
};

/**
 * At-a-glance KPIs and “next / first up” for the barber’s focused day,
 * computed from the same appointment payload the week grid already loads.
 */
export function BarberDailyOverview({
  day,
  appointments,
  className,
}: BarberDailyOverviewProps) {
  const ymd = formatYmd(day);
  const viewIsToday = isSameYmd(day, new Date());

  const [liveNowMs, setLiveNowMs] = useState(() => Date.now());

  useEffect(() => {
    setLiveNowMs(Date.now());
  }, [ymd]);

  useEffect(() => {
    const todayYmd = formatYmd(new Date());
    if (ymd !== todayYmd) return;
    const sync = () => setLiveNowMs(Date.now());
    const id = window.setInterval(sync, 30_000);
    const onVis = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ymd]);

  const nowMs = viewIsToday ? liveNowMs : Date.now();

  const dayAppointments = useMemo(() => {
    const list: AppointmentRecord[] = [];
    for (const a of appointments) {
      if (!a.starts_at || a.status !== "confirmed") continue;
      const start = new Date(a.starts_at);
      if (Number.isNaN(start.getTime())) continue;
      if (formatYmd(start) !== ymd) continue;
      list.push(a);
    }
    list.sort((a, b) => {
      const ta = new Date(a.starts_at!).getTime();
      const tb = new Date(b.starts_at!).getTime();
      return ta - tb;
    });
    return list;
  }, [appointments, ymd]);

  const dayQueue = useMemo(
    () => sortTodayConfirmedQueue(appointments, ymd),
    [appointments, ymd],
  );

  const liveSummary = useMemo(
    () => buildLiveShopSummary(dayQueue, nowMs),
    [dayQueue, nowMs],
  );

  const totals = useMemo(() => {
    let minutes = 0;
    let cents = 0;
    for (const a of dayAppointments) {
      minutes += a.service?.duration_minutes ?? 0;
      cents += a.service?.price_cents ?? 0;
    }
    return { minutes, cents, count: dayAppointments.length };
  }, [dayAppointments]);

  const inProgress = useMemo(() => {
    if (!viewIsToday || dayQueue.length === 0) return null;
    return findServingAppointment(dayQueue, nowMs);
  }, [dayQueue, nowMs, viewIsToday]);

  const spotlight = useMemo(() => {
    if (dayQueue.length === 0) return null;
    if (viewIsToday) {
      const upcoming = dayQueue.find(
        (a) => a.starts_at && new Date(a.starts_at).getTime() > nowMs,
      );
      return upcoming ?? null;
    }
    return dayQueue[0] ?? null;
  }, [dayQueue, viewIsToday, nowMs]);

  const doneForToday =
    viewIsToday &&
    dayAppointments.length > 0 &&
    inProgress === null &&
    spotlight === null &&
    dayAppointments.every(
      (a) => a.starts_at && new Date(a.starts_at).getTime() <= nowMs,
    );

  const headingDay = `${formatShortWeekday(day)}, ${formatMonthDay(day)}`;
  const ariaLabel = `Daily overview for ${headingDay}`;

  const chairMinutesLeft =
    inProgress != null ? minutesRemainingInVisit(inProgress, nowMs) : null;

  const spotlightWaitMinutes =
    !doneForToday && !inProgress && spotlight && viewIsToday
      ? minutesUntilStart(spotlight, nowMs)
      : null;

  const spotlightIsBehind =
    !doneForToday &&
    !inProgress &&
    spotlight != null &&
    viewIsToday &&
    deriveOperationalStatus(spotlight, nowMs) === "behind_schedule";

  const thenStartsInMinutes =
    inProgress && spotlight && viewIsToday
      ? minutesUntilStart(spotlight, nowMs)
      : null;

  return (
    <section
      className={cn(
        "rounded-xl border border-primary/20 bg-primary/[0.035] p-4 shadow-none dark:border-primary/15 dark:bg-primary/[0.05] sm:p-5 md:p-6",
        className,
      )}
      aria-label={ariaLabel}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 md:gap-8">
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-primary">
            {viewIsToday ? "Today" : "That day"}
          </h2>
          <p className="text-lg font-semibold tracking-tight text-foreground sm:text-xl md:text-2xl">
            {headingDay}
          </p>
          <p className="text-sm text-muted-foreground">
            {totals.count === 0
              ? "No bookings on this day — your chair is clear."
              : `${totals.count} booking${totals.count === 1 ? "" : "s"} on the books.`}
          </p>
        </div>

        <div className="grid w-full grid-cols-3 gap-2 sm:max-w-md sm:gap-3">
          <div className="flex min-h-[3.5rem] flex-col justify-center rounded-xl border border-border/45 bg-background/55 px-2 py-3 text-center sm:min-h-[4rem] sm:px-3 sm:py-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Cuts
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground sm:text-xl">
              {totals.count}
            </p>
          </div>
          <div className="flex min-h-[3.5rem] flex-col justify-center rounded-xl border border-border/45 bg-background/55 px-2 py-3 text-center sm:min-h-[4rem] sm:px-3 sm:py-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Chair
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground sm:text-xl">
              {formatDuration(totals.minutes)}
            </p>
          </div>
          <div className="flex min-h-[3.5rem] flex-col justify-center rounded-xl border border-border/45 bg-background/55 px-2 py-3 text-center sm:min-h-[4rem] sm:px-3 sm:py-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Booked
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground sm:text-xl">
              {formatGbp(totals.cents)}
            </p>
          </div>
        </div>
      </div>

      {viewIsToday && dayQueue.length > 0 ? (
        <ShopLiveStatusBanner summary={liveSummary} className="mt-4" />
      ) : null}

      {totals.count === 0 ? (
        <div className="mt-4 sm:mt-5">
          <EmptyState
            title="Nothing on the calendar"
            description="Walk-ins still work below, or jump to another day if you are planning ahead."
            action={
              <Button asChild variant="outline" size="sm" className="min-h-11 touch-manipulation sm:min-h-10">
                <Link href="/barber/hours">Adjust hours</Link>
              </Button>
            }
          />
        </div>
      ) : null}

      {dayQueue.length === 0 ? null : (
        <Card className="mt-4 border-border/40 bg-background/70 shadow-none dark:bg-background/50">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">
                {doneForToday
                  ? "You're through today's queue"
                  : inProgress
                    ? "Right now"
                    : viewIsToday
                      ? "Next up"
                      : "First up"}
              </CardTitle>
              {!doneForToday && inProgress ? (
                <OperationalStatusChip
                  status={deriveOperationalStatus(inProgress, nowMs)}
                />
              ) : null}
              {!doneForToday && !inProgress && spotlight ? (
                <OperationalStatusChip
                  status={deriveOperationalStatus(spotlight, nowMs)}
                />
              ) : null}
            </div>
            <CardDescription>
              {doneForToday
                ? "Great work — no more upcoming cuts today."
                : inProgress
                  ? `${formatTime(inProgress.starts_at)} – ${formatTime(inProgress.ends_at)} · ${inProgress.service?.name ?? "Service"}${inProgress.customer?.name ? ` · ${inProgress.customer.name}` : ""}`
                  : spotlight
                    ? `${formatTime(spotlight.starts_at)} · ${spotlight.service?.name ?? "Service"}${spotlight.customer?.name ? ` · ${spotlight.customer.name}` : ""}`
                    : "First slot of the day."}
            </CardDescription>
            {chairMinutesLeft != null ? (
              <p className="pt-1 text-sm text-muted-foreground">
                About {chairMinutesLeft} min left in this visit.
              </p>
            ) : null}
            {!doneForToday && !inProgress && spotlight && viewIsToday ? (
              <>
                {spotlightWaitMinutes != null ? (
                  <p className="pt-1 text-sm text-muted-foreground">
                    Starts in about {spotlightWaitMinutes} min.
                  </p>
                ) : null}
                {spotlightIsBehind ? (
                  <p className="pt-1 text-sm text-amber-900/90 dark:text-amber-100/90">
                    This visit is behind schedule — guests in the lounge are
                    still covered by your queue view above.
                  </p>
                ) : null}
              </>
            ) : null}
            {inProgress && spotlight ? (
              <div className="space-y-1 pt-2">
                <p className="text-sm font-medium text-foreground">Then</p>
                <p className="text-sm text-muted-foreground">
                  {`${formatTime(spotlight.starts_at)} · ${spotlight.service?.name ?? "Service"}${spotlight.customer?.name ? ` · ${spotlight.customer.name}` : ""}`}
                  {viewIsToday && thenStartsInMinutes != null ? (
                    <> · starts in about {thenStartsInMinutes} min</>
                  ) : viewIsToday ? (
                    <> · up next</>
                  ) : null}
                </p>
                <OperationalStatusChip
                  status={deriveOperationalStatus(spotlight, nowMs)}
                  compact
                  className="mt-1"
                />
              </div>
            ) : null}
          </CardHeader>
          {inProgress ? (
            <CardContent className="flex flex-wrap gap-2 pt-0">
              <Button
                asChild
                size="sm"
                className="min-h-12 touch-manipulation sm:min-h-10"
              >
                <Link href={`/appointments/${inProgress.id}/confirmation`}>
                  Open booking
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="min-h-12 touch-manipulation sm:min-h-10"
              >
                <Link href="/appointments">All appointments</Link>
              </Button>
            </CardContent>
          ) : spotlight ? (
            <CardContent className="flex flex-wrap gap-2 pt-0">
              <Button
                asChild
                size="sm"
                className="min-h-12 touch-manipulation sm:min-h-10"
              >
                <Link href={`/appointments/${spotlight.id}/confirmation`}>
                  Open booking
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="min-h-12 touch-manipulation sm:min-h-10"
              >
                <Link href="/appointments">All appointments</Link>
              </Button>
            </CardContent>
          ) : null}
        </Card>
      )}
    </section>
  );
}
