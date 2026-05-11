"use client";

import {
  buildShopHoursFromQuickSelection,
  quickSelectionFromWeekdays,
} from "@/lib/shop-default-hours";
import type { BarberAvailabilityDay } from "@ozilcuts/types";
import { BARBER_WEEKDAY_LABELS } from "@ozilcuts/types";
import { Button, Label, cn } from "@ozilcuts/ui";
import { useEffect, useState } from "react";

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

export function ShopDefaultHoursFields({
  value,
  onChange,
}: ShopDefaultHoursFieldsProps) {
  const derived = quickSelectionFromWeekdays(value);
  const [selected, setSelected] = useState<Set<number>>(derived.selected);
  const [open, setOpen] = useState(derived.open);
  const [close, setClose] = useState(derived.close);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    const d = quickSelectionFromWeekdays(value);
    setSelected(d.selected);
    setOpen(d.open);
    setClose(d.close);
  }, [value]);

  function toggleDay(weekday: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(weekday)) next.delete(weekday);
      else next.add(weekday);
      return next;
    });
    setApplyError(null);
  }

  function presetDays(days: Iterable<number>) {
    setSelected(new Set(days));
    setApplyError(null);
  }

  function applyTemplate() {
    if (selected.size === 0) {
      setApplyError("Select at least one day.");
      return;
    }
    const startM = minutesFromTimeString(open);
    const endM = minutesFromTimeString(close);
    if (endM <= startM) {
      setApplyError("Closing time must be after opening time.");
      return;
    }
    setApplyError(null);
    onChange(buildShopHoursFromQuickSelection(selected, open, close));
  }

  return (
    <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4 dark:border-primary/25 dark:bg-primary/10">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Default shop hours
        </h3>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          New barbers copy these bookable hours until you change them per chair.
          Step three is where you fine-tune individual schedules.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {BARBER_WEEKDAY_LABELS.map((label, weekday) => {
          const on = selected.has(weekday);
          return (
            <button
              key={label}
              type="button"
              aria-pressed={on}
              onClick={() => toggleDay(weekday)}
              className={cn(
                "min-h-11 min-w-[2.75rem] touch-manipulation rounded-full border px-2.5 text-xs font-semibold transition-colors sm:min-h-9",
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
          className="min-h-10"
          onClick={() => presetDays([1, 2, 3, 4, 5])}
        >
          Mon–Fri
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-10"
          onClick={() => presetDays([0, 1, 2, 3, 4, 5, 6])}
        >
          Every day
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-10"
          onClick={() => presetDays([0, 6])}
        >
          Weekend
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="shop-default-opens">Opens</Label>
          <input
            id="shop-default-opens"
            type="time"
            step={60}
            value={open}
            onChange={(ev) => {
              setOpen(ev.target.value);
              setApplyError(null);
            }}
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
            onChange={(ev) => {
              setClose(ev.target.value);
              setApplyError(null);
            }}
            className="border-input bg-background text-foreground focus-visible:ring-ring/50 flex h-11 w-full rounded-lg border px-3 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:h-10 sm:text-sm"
          />
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        className="min-h-11 w-full sm:w-auto"
        onClick={applyTemplate}
      >
        Apply to selected days
      </Button>
      {applyError ? (
        <p className="text-xs text-destructive" role="alert">
          {applyError}
        </p>
      ) : null}
    </div>
  );
}
