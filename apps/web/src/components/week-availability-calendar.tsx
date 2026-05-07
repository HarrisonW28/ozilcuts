"use client";

import type { CSSProperties } from "react";

import { cn } from "@ozilcuts/ui";
import { BARBER_WEEKDAY_LABELS } from "@ozilcuts/types";
import type { WeekDaySchedule } from "@/lib/calendar-week";
import {
  formatMonthDay,
  formatShortWeekday,
  timeToMinutes,
} from "@/lib/calendar-week";

const GRID_START_MIN = 6 * 60;
const GRID_END_MIN = 22 * 60;
const GRID_SPAN = GRID_END_MIN - GRID_START_MIN;

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
};

function DayColumn({ day }: { day: WeekDaySchedule }) {
  const label = `${formatShortWeekday(day.date)}, ${formatMonthDay(day.date)} — ${
    BARBER_WEEKDAY_LABELS[day.weekday] ?? `day ${day.weekday}`
  }`;

  return (
    <div className="flex flex-col gap-2 sm:min-w-0">
      <div className="text-center sm:text-left">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {formatShortWeekday(day.date)}
        </div>
        <div className="text-sm font-semibold text-foreground">
          {formatMonthDay(day.date)}
        </div>
      </div>
      <div
        className="relative h-52 rounded-lg bg-muted/25 ring-1 ring-border/50 sm:h-64"
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
              className="absolute inset-x-1 flex items-start justify-center overflow-hidden rounded-md border border-primary/35 bg-primary/15 px-0.5 py-0.5 text-center text-[0.6rem] font-medium leading-tight text-foreground shadow-sm sm:inset-x-2 sm:text-xs"
              style={blockStyle(clipped.start, clipped.end)}
            >
              <span aria-hidden>
                {w.starts_at}–{w.ends_at}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WeekAvailabilityCalendar({
  weekLabel,
  days,
  className,
}: WeekAvailabilityCalendarProps) {
  return (
    <section
      aria-label={`Availability calendar, ${weekLabel}`}
      className={cn("w-full", className)}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 lg:gap-2">
        {days.map((day) => (
          <DayColumn key={day.date.toISOString()} day={day} />
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground lg:text-left">
        Timeline shows 6:00a–10:00p. Blocks match your saved weekly hours.
      </p>
    </section>
  );
}
