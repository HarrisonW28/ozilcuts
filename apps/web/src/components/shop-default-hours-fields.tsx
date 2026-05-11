"use client";

import {
  buildShopHoursFromQuickSelection,
  quickSelectionFromWeekdays,
} from "@/lib/shop-default-hours";
import type { BarberAvailabilityDay } from "@ozilcuts/types";
import { BARBER_WEEKDAY_LABELS } from "@ozilcuts/types";
import { Button, Label, cn } from "@ozilcuts/ui";
import { useMemo, useState } from "react";

function minutesFromTimeString(t: string): number {
  const slice = t.slice(0, 5);
  const [h, m] = slice.split(":").map((x) => Number.parseInt(x, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

export type ShopDefaultHoursFieldsProps = {
  value: BarberAvailabilityDay[];
  onChange: (next: BarberAvailabilityDay[]) => void;
};

/**
 * Single source of truth: `value` from the parent. Day/time edits call `onChange`
 * immediately so Continue always saves the visible schedule (no separate Apply step).
 */
export function ShopDefaultHoursFields({
  value,
  onChange,
}: ShopDefaultHoursFieldsProps) {
  const [draftError, setDraftError] = useState<string | null>(null);

  const { selectedDays, open, close } = useMemo(() => {
    const d = quickSelectionFromWeekdays(value);
    return {
      selectedDays: d.selected,
      open: d.open,
      close: d.close,
    };
  }, [value]);

  function commit(next: BarberAvailabilityDay[]) {
    setDraftError(null);
    onChange(next);
  }

  function toggleDay(weekday: number) {
    const nextSel = new Set(selectedDays);
    if (nextSel.has(weekday)) nextSel.delete(weekday);
    else nextSel.add(weekday);
    if (nextSel.size === 0) {
      setDraftError("Choose at least one day the shop is open.");
      return;
    }
    const startM = minutesFromTimeString(open);
    const endM = minutesFromTimeString(close);
    if (endM <= startM) {
      setDraftError("Closing time must be after opening time.");
      return;
    }
    commit(buildShopHoursFromQuickSelection(nextSel, open, close));
  }

  function presetDays(days: Iterable<number>) {
    const nextSel = new Set(days);
    if (nextSel.size === 0) {
      setDraftError("Choose at least one day the shop is open.");
      return;
    }
    const startM = minutesFromTimeString(open);
    const endM = minutesFromTimeString(close);
    if (endM <= startM) {
      setDraftError("Closing time must be after opening time.");
      return;
    }
    commit(buildShopHoursFromQuickSelection(nextSel, open, close));
  }

  function updateOpen(nextOpen: string) {
    const startM = minutesFromTimeString(nextOpen);
    const endM = minutesFromTimeString(close);
    if (endM <= startM) {
      setDraftError("Closing time must be after opening time.");
      return;
    }
    commit(buildShopHoursFromQuickSelection(selectedDays, nextOpen, close));
  }

  function updateClose(nextClose: string) {
    const startM = minutesFromTimeString(open);
    const endM = minutesFromTimeString(nextClose);
    if (endM <= startM) {
      setDraftError("Closing time must be after opening time.");
      return;
    }
    commit(buildShopHoursFromQuickSelection(selectedDays, open, nextClose));
  }

  return (
    <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4 dark:border-primary/25 dark:bg-primary/10">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Default shop hours
        </h3>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          New barbers copy these bookable hours until you change them per chair.
          Toggle days and set open/close—they save when you tap Continue. Step
          three is where you fine-tune individual schedules.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {BARBER_WEEKDAY_LABELS.map((label, weekday) => {
          const on = selectedDays.has(weekday);
          return (
            <button
              key={label}
              type="button"
              aria-pressed={on}
              onClick={() => toggleDay(weekday)}
              className={cn(
                "relative z-10 min-h-11 min-w-[2.75rem] touch-manipulation rounded-full border px-2.5 text-xs font-semibold transition-colors sm:min-h-9",
                on
                  ? "border-primary/50 bg-primary/15 text-foreground"
                  : "border-border/70 bg-background/80 text-muted-foreground hover:border-border hover:bg-muted/40",
              )}
            >
              {label.slice(0, 3)}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="relative z-10 min-h-10"
          onClick={() => presetDays([1, 2, 3, 4, 5])}
        >
          Mon–Fri
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="relative z-10 min-h-10"
          onClick={() => presetDays([0, 1, 2, 3, 4, 5, 6])}
        >
          Every day
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="relative z-10 min-h-10"
          onClick={() => presetDays([0, 6])}
        >
          Weekend
        </Button>
      </div>
      <div className="relative z-10 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="shop-default-opens">Opens</Label>
          <input
            id="shop-default-opens"
            type="time"
            step={60}
            value={open}
            onChange={(ev) => updateOpen(ev.target.value)}
            className="border-input bg-background text-foreground focus-visible:ring-ring/50 flex h-11 w-full rounded-lg border px-3 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:h-10 sm:text-sm"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="shop-default-closes">Closes</Label>
          <input
            id="shop-default-closes"
            type="time"
            step={60}
            value={close}
            onChange={(ev) => updateClose(ev.target.value)}
            className="border-input bg-background text-foreground focus-visible:ring-ring/50 flex h-11 w-full rounded-lg border px-3 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:h-10 sm:text-sm"
          />
        </div>
      </div>
      {draftError ? (
        <p className="text-xs text-destructive" role="alert">
          {draftError}
        </p>
      ) : null}
    </div>
  );
}
