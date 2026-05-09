"use client";

import type { CSSProperties } from "react";

import { cn } from "@ozilcuts/ui";
import { BARBER_WEEKDAY_LABELS } from "@ozilcuts/types";
import type { BookingBlock, WeekDaySchedule } from "@/lib/calendar-week";
import {
  formatMonthDay,
  formatShortWeekday,
  isSameYmd,
  timeToMinutes,
} from "@/lib/calendar-week";
import Link from "next/link";

const GRID_START_MIN = 6 * 60;
const GRID_END_MIN = 22 * 60;
const GRID_SPAN = GRID_END_MIN - GRID_START_MIN;

export type CalendarDensity = "comfortable" | "compact";

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

function blockStyle(startMin: number, endMin: number): CSSProperties {
  const topPct = ((startMin - GRID_START_MIN) / GRID_SPAN) * 100;
  const heightPct = ((endMin - startMin) / GRID_SPAN) * 100;

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

function bookingBlockClasses(status: BookingBlock["status"]): string {
  if (status === "cancelled") {
    return "border-muted-foreground/30 bg-muted/40 text-muted-foreground line-through";
  }

  return "border-foreground/40 bg-foreground/85 text-background hover:bg-foreground/90";
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
        "motion-interactive flex flex-col gap-2 rounded-lg p-2 text-left outline-none transition-colors sm:min-w-0",
        "focus-visible:ring-2 focus-visible:ring-ring",
        isFocused
          ? "bg-muted/40 ring-1 ring-foreground/30"
          : "hover:bg-muted/30",
        isToday && !isFocused ? "ring-1 ring-primary/30" : null,
      )}
    >
      <div className="text-center sm:text-left">
        <div
          className={cn(
            "text-xs font-medium uppercase tracking-wide",
            isToday ? "text-primary" : "text-muted-foreground",
          )}
        >
          {formatShortWeekday(day.date)}
          {isToday ? <span className="sr-only"> (today)</span> : null}
        </div>
        <div className="text-sm font-semibold text-foreground">
          {formatMonthDay(day.date)}
        </div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {headerCountLabel}
        </div>
      </div>
      <div
        className={cn(
          "relative rounded-lg bg-muted/25 ring-1 ring-border/50",
          density === "compact" ? "h-40 sm:h-48" : "h-52 sm:h-64",
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
              className="absolute inset-x-1 flex items-start justify-center overflow-hidden rounded-md border border-primary/35 bg-primary/10 px-0.5 py-0.5 text-center text-[0.6rem] font-medium leading-tight text-foreground/80 shadow-sm sm:inset-x-2 sm:text-xs"
              style={blockStyle(clipped.start, clipped.end)}
            >
              <span aria-hidden>
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
                "motion-interactive absolute inset-x-1 z-10 block overflow-hidden rounded-md border px-1 py-0.5 text-[0.6rem] font-medium leading-tight shadow-sm transition-colors sm:inset-x-2 sm:text-[11px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                bookingBlockClasses(b.status),
              )}
              style={blockStyle(clipped.start, clipped.end)}
            >
              <span className="line-clamp-2">{b.label}</span>
            </Link>
          );
        })}

        {showNowLine ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
            style={{ top: `${nowTopPct}%` }}
          >
            <span className="-ml-1 inline-block h-2 w-2 rounded-full bg-destructive shadow" />
            <span className="h-px flex-1 bg-destructive/70" />
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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
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
      <p className="mt-4 text-center text-xs text-muted-foreground lg:text-left">
        Timeline shows 6:00a–10:00p. Lighter blocks are your saved hours;
        darker blocks are confirmed bookings — click any to open it.
      </p>
    </section>
  );
}
