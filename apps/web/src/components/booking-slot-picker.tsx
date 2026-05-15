"use client";

import { SmartSlotHintsPanel } from "@/components/smart-slot-hints";
import { TimeSlotChipsSkeleton } from "@/components/load-empty";
import {
  orderSlotsWithSuggestions,
  type SlotDisplayItem,
} from "@/lib/booking-slot-suggestions";
import type { SmartSlotHintsLoadStatus } from "@/lib/smart-slot-hints";
import { reportFilterControlClass } from "@/lib/report-filter-classes";
import type { BarberSmartSlotHintsPayload } from "@ozilcuts/types";
import { Button, Label, cn } from "@ozilcuts/ui";

function formatTimeFromIso(iso: string): string {
  const [, time] = iso.split("T");
  return (time ?? "").slice(0, 5);
}

function formatIsoDate(date: string): string {
  const [y, m, d] = date.split("-").map((s) => Number.parseInt(s, 10));
  if (!y || !m || !d) return date;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

type SlotsState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; slots: string[] }
  | { kind: "error"; message: string };

type BookingSlotPickerProps = {
  date: string;
  today: string;
  slots: SlotsState;
  slotHints: BarberSmartSlotHintsPayload | null;
  slotHintsStatus: SmartSlotHintsLoadStatus;
  /** Re-fetch hints (parent usually reloads slots too). */
  onRetrySlotHints?: () => void;
  viewerContext: "customer" | "staff";
  selectedSlot: string | null;
  onSelectSlot: (slot: string) => void;
  onDateChange: (date: string) => void;
  onJumpToPredictedDay: (dateYmd: string) => void;
  onPickNextAvailable: () => void;
};

export function BookingSlotPicker({
  date,
  today,
  slots,
  slotHints,
  slotHintsStatus,
  onRetrySlotHints,
  viewerContext,
  selectedSlot,
  onSelectSlot,
  onDateChange,
  onJumpToPredictedDay,
  onPickNextAvailable,
}: BookingSlotPickerProps) {
  const slotDisplayItems: SlotDisplayItem[] =
    slots.kind === "ok"
      ? orderSlotsWithSuggestions(slots.slots, date, new Date(), slotHints)
      : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-2">
        <Label
          htmlFor="b-date"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Date
        </Label>
        <input
          id="b-date"
          type="date"
          min={today}
          className={cn(
            reportFilterControlClass,
            "h-12 rounded-xl shadow-xs sm:h-11",
          )}
          value={date}
          onChange={(ev) => onDateChange(ev.target.value)}
          required
        />
        <p className="text-sm text-muted-foreground">{formatIsoDate(date)}</p>
      </div>

      <div className="flex flex-col gap-3">
        <p
          id="book-step-time"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Time
        </p>

        <SmartSlotHintsPanel
          hints={slotHints}
          status={slotHintsStatus}
          onRetryHints={onRetrySlotHints}
          viewerContext={viewerContext}
          onJumpToPredictedDay={onJumpToPredictedDay}
        />

        {slots.kind === "idle" ? (
          <p className="text-sm text-muted-foreground">
            Choose a service and barber to see open times.
          </p>
        ) : null}
        {slots.kind === "loading" ? <TimeSlotChipsSkeleton /> : null}
        {slots.kind === "error" ? (
          <p className="text-sm text-destructive" role="alert">
            {slots.message}
          </p>
        ) : null}
        {slots.kind === "ok" && slots.slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No openings on this day — try another date.
          </p>
        ) : null}

        {slots.kind === "ok" && slotDisplayItems.length > 0 ? (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full min-h-11 touch-manipulation sm:w-auto sm:min-h-10"
                onClick={onPickNextAvailable}
              >
                Next available
              </Button>
              <p className="text-xs text-muted-foreground sm:text-right">
                {slotHints?.personalized
                  ? "We rank times close to when you usually book, then factor reopenings and the earliest opens."
                  : "Suggested times favour the soonest openings today."}
              </p>
            </div>
            <div
              role="radiogroup"
              aria-labelledby="book-step-time"
              className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-2.5"
            >
              {slotDisplayItems.map(
                ({ slot, suggested, suggestionReason }) => {
                  const checked = selectedSlot === slot;
                  const pickLabel =
                    suggestionReason === "preferred_time"
                      ? "Your usual time"
                      : suggestionReason === "cancellation_signal"
                        ? "Fresh opening"
                        : "Suggested";

                  return (
                    <button
                      key={slot}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      aria-label={
                        suggested
                          ? `${pickLabel}: ${formatTimeFromIso(slot)}`
                          : formatTimeFromIso(slot)
                      }
                      onClick={() => onSelectSlot(slot)}
                      className={cn(
                        "motion-interactive flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-2 text-sm font-medium tabular-nums touch-manipulation transition-[border-color,background-color,transform] sm:min-h-11",
                        checked
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : suggested
                            ? "border-primary/45 bg-primary/[0.07] text-foreground hover:bg-primary/15 motion-safe:active:scale-[0.98] dark:border-primary/35 dark:bg-primary/[0.12]"
                            : "border-border/70 bg-background text-foreground hover:bg-muted/50 motion-safe:active:scale-[0.98]",
                      )}
                    >
                      {suggested ? (
                        <span
                          className={cn(
                            "text-[0.625rem] font-semibold uppercase tracking-wide",
                            checked
                              ? "text-primary-foreground/90"
                              : "text-primary",
                          )}
                        >
                          {pickLabel}
                        </span>
                      ) : null}
                      <span>{formatTimeFromIso(slot)}</span>
                    </button>
                  );
                },
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
