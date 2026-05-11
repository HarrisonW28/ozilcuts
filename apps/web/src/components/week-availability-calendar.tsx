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
  isSameYmd,
  timeToMinutes,
} from "@/lib/calendar-week";
import { appointmentScheduleBlockClassName } from "@/lib/appointment-schedule-block";
import Link from "next/link";

const GRID_START_MIN = CALENDAR_GRID_START_MIN;
const GRID_END_MIN = CALENDAR_GRID_END_MIN;
const GRID_SPAN = CALENDAR_GRID_SPAN_MIN;

export type { CalendarDensity } from "@/lib/calendar-week";

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

function blockStyle(
  startMin: number,
  endMin: number,
  options?: { minHeightPct?: number },
): CSSProperties {
  const topPct = ((startMin - GRID_START_MIN) / GRID_SPAN) * 100;
  let heightPct = ((endMin - startMin) / GRID_SPAN) * 100;
  if (options?.minHeightPct !== undefined) {
    heightPct = Math.max(heightPct, options.minHeightPct);
  }

  return {
    top: `${topPct}%`,
    height: `${Math.max(heightPct, 2)}%`,
  };
}

export type WeekAvailabilityCalendarProps = {
  /** Range label for accessibility, e.g. from `formatWeekRangeLabel` */
  weekLabel: string;
  days: WeekDaySchedule[];
  className?: string;
  /** Defaults to system "now" each render; overridable for tests. */
  now?: Date;
  /** Highlight + focus styling for the currently focused day column. */
  focusedDate?: Date;
  onDayFocus?: (date: Date) => void;
  density?: CalendarDensity;
};

function nowMinutes(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

function DayColumn({
  day,
  now,
  isFocused,
  onFocus,
  density,
}: {
  day: WeekDaySchedule;
  now: Date;
  isFocused: boolean;
  onFocus?: (date: Date) => void;
  density: CalendarDensity;
}) {
  const isToday = isSameYmd(day.date, now);
  const label = `${formatShortWeekday(day.date)}, ${formatMonthDay(day.date)} — ${
    BARBER_WEEKDAY_LABELS[day.weekday] ?? `day ${day.weekday}`
  }`;
  const totalBookings = day.bookings.length;
  const headerCountLabel =
    totalBookings === 0
      ? "No bookings"
      : `${totalBookings} ${totalBookings === 1 ? "booking" : "bookings"}`;
  const nowMin = nowMinutes(now);
  const showNowLine =
    isToday && nowMin >= GRID_START_MIN && nowMin <= GRID_END_MIN;
  const nowTopPct = ((nowMin - GRID_START_MIN) / GRID_SPAN) * 100;

  return (
    <button
      type="button"
      onClick={() => onFocus?.(day.date)}
      aria-pressed={isFocused}
      aria-label={`${label}, ${headerCountLabel}`}
      className={cn(
        "motion-interactive flex h-full min-h-[17rem] flex-col gap-2 rounded-2xl border px-2 py-2.5 text-left outline-none transition-colors sm:min-h-[18rem] sm:px-2.5 sm:py-3 lg:min-h-[19rem]",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isFocused
          ? "border-primary/45 bg-primary/[0.06]"
          : "border-border/40 bg-card/30 hover:border-border/55 hover:bg-muted/20 dark:bg-card/15",
      )}
    >
      <header className="shrink-0 space-y-1 border-b border-border/30 pb-2">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wide",
              isToday ? "text-primary" : "text-muted-foreground",
            )}
          >
            {formatShortWeekday(day.date)}
            {isToday ? <span className="sr-only"> (today)</span> : null}
          </span>
          {isToday ? (
            <span
              className="size-2 shrink-0 rounded-full bg-primary shadow-[0_0_0_2px] shadow-background"
              aria-hidden
            />
          ) : null}
        </div>
        <p className="text-[13px] font-semibold leading-tight text-foreground">
          {formatMonthDay(day.date)}
        </p>
        <p className="text-[11px] leading-snug text-muted-foreground">
          {headerCountLabel}
        </p>
      </header>

      <div
        className={cn(
          "relative min-h-0 flex-1 overflow-hidden rounded-xl bg-gradient-to-b from-muted/25 to-muted/[0.07] dark:from-muted/20 dark:to-muted/5",
          density === "compact" ? "min-h-[11rem]" : "min-h-[12rem] sm:min-h-[13rem]",
        )}
        role="img"
        aria-label={
          day.windows.length === 0
            ? `${label}: no hours`
            : `${label}: ${day.windows
                .map((w) => `${w.starts_at} to ${w.ends_at}`)
                .join("; ")}`
        }
      >
        {/* Subtle quarter-hour rhythm (theme-safe); omit if it fights contrast */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.22] dark:opacity-[0.12]"
          aria-hidden
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent, transparent calc(25% - 1px), color-mix(in oklab, var(--border) 55%, transparent) calc(25% - 1px), color-mix(in oklab, var(--border) 55%, transparent) 25%)",
          }}
        />

        {day.windows.map((w) => {
          const startMin = timeToMinutes(w.starts_at);
          const endMin = timeToMinutes(w.ends_at);
          const clipped = clipWindow(startMin, endMin);
          if (!clipped) {
            return null;
          }

          return (
            <div
              key={`${w.starts_at}-${w.ends_at}`}
              className="absolute inset-x-1.5 overflow-hidden rounded-md border-l-[3px] border-l-primary/55 bg-background/65 pl-2 pr-1 pt-1 shadow-sm dark:border-l-primary/50 dark:bg-background/40 sm:inset-x-2"
              style={blockStyle(clipped.start, clipped.end)}
            >
              <span
                className="block text-[10px] font-medium tabular-nums leading-tight text-muted-foreground sm:text-[11px]"
                aria-hidden
              >
                {w.starts_at}–{w.ends_at}
              </span>
            </div>
          );
        })}

        {day.bookings.map((b) => {
          const clipped = clipWindow(b.startMin, b.endMin);
          if (!clipped) {
            return null;
          }
          return (
            <Link
              key={b.id}
              href={b.href}
              onClick={(e) => e.stopPropagation()}
              aria-label={`${b.label}, ${formatShortWeekday(day.date)} ${formatMonthDay(day.date)}`}
              className={cn(
                "absolute inset-x-1.5 z-10 flex items-start overflow-hidden sm:inset-x-2",
                appointmentScheduleBlockClassName(b.status, "week"),
              )}
              style={blockStyle(clipped.start, clipped.end, {
                minHeightPct: 9,
              })}
            >
              <span className="line-clamp-2 leading-snug">{b.label}</span>
            </Link>
          );
        })}

        {showNowLine ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
            style={{ top: `${nowTopPct}%` }}
          >
            <span className="-ml-px inline-block size-2 rounded-full bg-primary shadow-[0_0_0_2px] shadow-background ring-1 ring-primary/40" />
            <span className="h-px flex-1 bg-gradient-to-r from-primary to-transparent opacity-80" />
          </div>
        ) : null}
      </div>
    </button>
  );
}

export function WeekAvailabilityCalendar({
  weekLabel,
  days,
  className,
  now,
  focusedDate,
  onDayFocus,
  density = "comfortable",
}: WeekAvailabilityCalendarProps) {
  const currentNow = now ?? new Date();

  return (
    <section
      aria-label={`Availability calendar, ${weekLabel}`}
      className={cn("w-full", className)}
    >
      <div className="w-full overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] lg:overflow-visible">
        <div className="grid min-w-[52rem] grid-cols-7 gap-2 sm:min-w-[56rem] sm:gap-2.5 lg:min-w-0 lg:gap-3 [&>*]:min-w-0">
          {days.map((day) => (
            <DayColumn
              key={day.date.toISOString()}
              day={day}
              now={currentNow}
              isFocused={focusedDate ? isSameYmd(day.date, focusedDate) : false}
              onFocus={onDayFocus}
              density={density}
            />
          ))}
        </div>
      </div>
      <p className="mt-3 text-pretty text-center text-[11px] leading-relaxed text-muted-foreground lg:text-left">
        Same scale as the day view: 6:00a–10:00p. Tinted columns are shop hours;
        cards are appointments (tap).
      </p>
    </section>
  );
}
