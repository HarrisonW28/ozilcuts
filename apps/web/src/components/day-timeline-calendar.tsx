"use client";

import type { CSSProperties } from "react";

import { cn } from "@ozilcuts/ui";
import { BARBER_WEEKDAY_LABELS } from "@ozilcuts/types";
import type { CalendarDensity, WeekDaySchedule } from "@/lib/calendar-week";
import {
  CALENDAR_GRID_END_MIN,
  CALENDAR_GRID_SPAN_MIN,
  CALENDAR_GRID_START_MIN,
  formatMonthDay,
  formatShortWeekday,
  formatYmd,
  isSameYmd,
  placeBookings,
  timeToMinutes,
} from "@/lib/calendar-week";
import { appointmentScheduleBlockClassName } from "@/lib/appointment-schedule-block";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const GRID_START_MIN = CALENDAR_GRID_START_MIN;
const GRID_END_MIN = CALENDAR_GRID_END_MIN;
const GRID_SPAN = CALENDAR_GRID_SPAN_MIN;

function pxPerMinute(density: CalendarDensity): number {
  return density === "compact" ? 0.88 : 1.12;
}

const TIMELINE_MAX_HEIGHT = "min(72vh, 920px)";

function clipWindow(
  startMin: number,
  endMin: number,
): { start: number; end: number } | null {
  const s = Math.max(startMin, GRID_START_MIN);
  const e = Math.min(endMin, GRID_END_MIN);
  if (e <= s) {
    return null;
  }

  return { start: s, end: e };
}

function blockLayout(
  startMin: number,
  endMin: number,
  pxPerMin: number,
): { top: number; height: number } {
  const top = (startMin - GRID_START_MIN) * pxPerMin;
  const rawH = (endMin - startMin) * pxPerMin;
  const height = Math.max(rawH, 44);

  return { top, height };
}

function nowMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export type DayTimelineCalendarProps = {
  day: WeekDaySchedule;
  className?: string;
  now?: Date;
  density?: CalendarDensity;
};

export function DayTimelineCalendar({
  day,
  className,
  now: nowProp,
  density = "comfortable",
}: DayTimelineCalendarProps) {
  const [liveAt, setLiveAt] = useState(() => new Date());
  const dayYmd = formatYmd(day.date);

  useEffect(() => {
    if (nowProp != null) return;
    setLiveAt(new Date());
  }, [dayYmd, nowProp]);

  useEffect(() => {
    if (nowProp != null) return;
    if (dayYmd !== formatYmd(new Date())) return;
    const bump = () => setLiveAt(new Date());
    const id = window.setInterval(bump, 30_000);
    const onVis = () => {
      if (document.visibilityState === "visible") bump();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [nowProp, dayYmd]);

  const now = nowProp ?? liveAt;

  const isToday = isSameYmd(day.date, now);
  const ppm = pxPerMinute(density);
  const totalHeight = GRID_SPAN * ppm;

  const hourLabels = useMemo(() => {
    const out: { label: string; minute: number }[] = [];
    for (let m = GRID_START_MIN; m <= GRID_END_MIN; m += 60) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const d = new Date(2000, 0, 1, h, min);
      out.push({
        minute: m,
        label: d.toLocaleTimeString(undefined, { hour: "numeric" }),
      });
    }
    return out;
  }, []);

  const { placed, columnCount } = useMemo(
    () => placeBookings(day.bookings),
    [day.bookings],
  );

  const nowMin = nowMinutes(now);
  const showNow =
    isToday && nowMin >= GRID_START_MIN && nowMin <= GRID_END_MIN;
  const nowY = (nowMin - GRID_START_MIN) * ppm;

  const activeBookingId = useMemo(() => {
    if (!isToday || !showNow) return null;
    for (const b of day.bookings) {
      if (nowMin >= b.startMin && nowMin < b.endMin) return b.id;
    }
    return null;
  }, [day.bookings, isToday, showNow, nowMin]);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const dayKey = day.date.toISOString();

  /** Initial scroll only when the day window changes — not on every clock tick. */
  useLayoutEffect(() => {
    if (!isToday || !showNow) return;
    const el = scrollAreaRef.current;
    if (!el) return;
    const nm = nowMinutes(now);
    const y = (nm - GRID_START_MIN) * ppm;
    const target = Math.max(0, y - el.clientHeight * 0.22);
    el.scrollTop = target;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- omit `now` so the viewport is not jumped every 30s
  }, [isToday, showNow, dayKey, ppm, nowProp]);

  const headerLabel = `${formatShortWeekday(day.date)}, ${formatMonthDay(day.date)}`;
  const weekdayCaption =
    BARBER_WEEKDAY_LABELS[day.weekday] ?? `day ${day.weekday}`;

  return (
    <section
      aria-label={`Day schedule, ${headerLabel}`}
      className={cn(
        "dashboard-surface overflow-hidden rounded-xl",
        className,
      )}
    >
      <header className="border-b border-border/40 px-4 py-3.5 sm:px-5 sm:py-4 md:px-6 md:py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p
              className={cn(
                "text-[11px] font-medium uppercase tracking-wider",
                isToday ? "text-primary" : "text-muted-foreground",
              )}
            >
              {weekdayCaption}
              {isToday ? (
                <span className="ml-1.5 font-normal normal-case text-muted-foreground">
                  · Today
                </span>
              ) : null}
            </p>
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {headerLabel}
            </h2>
          </div>
            <p className="text-xs text-muted-foreground tabular-nums">
              {day.bookings.length === 0
                ? "No bookings"
                : `${day.bookings.length} booking${
                    day.bookings.length === 1 ? "" : "s"
                  }`}
              <span className="mx-1.5 text-border/80">·</span>
              6a–10p
            </p>
        </div>
      </header>

      <div
        ref={scrollAreaRef}
        className="flex max-h-[var(--tl-max)] overflow-y-auto overscroll-y-contain scroll-smooth pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
        style={
          {
            "--tl-max": TIMELINE_MAX_HEIGHT,
          } as CSSProperties
        }
      >
        {/* Time gutter — sticky while scrolling (operational scanning). */}
        <div
          className={cn(
            "sticky top-0 z-20 w-12 shrink-0 select-none",
            "relative border-r border-border/35 bg-muted/20 py-0 backdrop-blur-[1px]",
            "dark:bg-muted/15",
            "sm:w-14",
          )}
          style={{ height: totalHeight }}
        >
          {hourLabels.map(({ minute, label }) => {
            const y = (minute - GRID_START_MIN) * ppm;
            return (
              <div
                key={minute}
                className="absolute right-1.5 -translate-y-1/2 text-right text-[10px] font-medium tabular-nums text-muted-foreground sm:right-2 sm:text-xs"
                style={{ top: y }}
              >
                {label}
              </div>
            );
          })}
        </div>

        <div
          className="relative min-w-0 flex-1 touch-pan-y"
          style={{ minHeight: totalHeight }}
        >
          {/* Hour grid lines */}
          {hourLabels.map(({ minute }) => {
            const y = (minute - GRID_START_MIN) * ppm;
            return (
              <div
                key={`line-${minute}`}
                aria-hidden
                className="pointer-events-none absolute inset-x-0 border-t border-border/20"
                style={{ top: y }}
              />
            );
          })}

          {/* Half-hour guides (subtle) */}
          {hourLabels.slice(0, -1).map(({ minute }) => {
            const y = (minute - GRID_START_MIN + 30) * ppm;
            return (
              <div
                key={`half-${minute}`}
                aria-hidden
                className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/10"
                style={{ top: y }}
              />
            );
          })}

          {/* Availability wash */}
          {day.windows.map((w) => {
            const startMin = timeToMinutes(w.starts_at);
            const endMin = timeToMinutes(w.ends_at);
            const clipped = clipWindow(startMin, endMin);
            if (!clipped) {
              return null;
            }
            const { top, height } = blockLayout(
              clipped.start,
              clipped.end,
              ppm,
            );

            return (
              <div
                key={`${w.starts_at}-${w.ends_at}`}
                aria-hidden
                className={cn(
                  "pointer-events-none absolute left-0 right-2 rounded-lg",
                  "bg-primary/[0.06] ring-1 ring-inset ring-primary/[0.08]",
                  "dark:bg-primary/[0.08]",
                )}
                style={{ top, height }}
              />
            );
          })}

          {/* Bookings */}
          <div className="absolute inset-x-0 top-0 px-1.5 pb-2 sm:px-2">
            {placed.map(({ booking: b, column }) => {
              const clipped = clipWindow(b.startMin, b.endMin);
              if (!clipped) {
                return null;
              }
              const { top, height } = blockLayout(
                clipped.start,
                clipped.end,
                ppm,
              );
              const colW = 100 / columnCount;
              const leftPct = column * colW;
              const gapPx = 3;

              return (
                <Link
                  key={b.id}
                  href={b.href}
                  className={cn(
                    "absolute flex flex-col justify-start overflow-hidden",
                    "min-h-12 touch-manipulation text-left sm:min-h-11",
                    "focus-visible:z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    "active:opacity-[0.92]",
                    appointmentScheduleBlockClassName(b.status, "timeline"),
                    activeBookingId === b.id &&
                      "z-30 ring-2 ring-inset ring-primary",
                  )}
                  style={{
                    top,
                    height,
                    left: `calc(${leftPct}% + ${gapPx / 2}px)`,
                    width: `calc(${colW}% - ${gapPx}px)`,
                  }}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {formatBlockTimeRange(clipped.start, clipped.end)}
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-xs font-semibold leading-snug sm:text-sm">
                    {b.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {showNow ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 z-40 flex items-center pr-2"
              style={{ top: nowY }}
            >
              <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-primary shadow-[0_0_0_3px] shadow-background ring-2 ring-primary" />
              <span className="h-px min-w-0 flex-1 bg-gradient-to-r from-primary to-primary/20" />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function formatBlockTimeRange(startMin: number, endMin: number): string {
  const fmt = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const d = new Date(2000, 0, 1, h, min);

    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return `${fmt(startMin)} – ${fmt(endMin)}`;
}
