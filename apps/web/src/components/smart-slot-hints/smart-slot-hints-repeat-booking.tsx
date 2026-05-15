"use client";

import type { BarberSmartSlotRepeatBooking } from "@ozilcuts/types";
import { Button, cn } from "@ozilcuts/ui";
import { CalendarClock } from "lucide-react";

type SmartSlotHintsRepeatBookingProps = {
  repeat: BarberSmartSlotRepeatBooking;
  formattedDate: string;
  onJumpToDay: (dateYmd: string) => void;
  className?: string;
};

export function SmartSlotHintsRepeatBooking({
  repeat,
  formattedDate,
  onJumpToDay,
  className,
}: SmartSlotHintsRepeatBookingProps) {
  const { predicted_next_date, sample_size } = repeat;
  const sampleNote =
    sample_size >= 3
      ? `Pattern from ${sample_size} past visits.`
      : sample_size === 2
        ? "Based on your last two visits."
        : sample_size === 1
          ? "We’ll sharpen this after more visits."
          : null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border/40 bg-background/55 p-3.5 dark:border-border/35 dark:bg-background/45",
        className,
      )}
    >
      <div className="flex gap-2">
        <CalendarClock
          className="mt-0.5 size-5 shrink-0 text-primary"
          aria-hidden
        />
        <div className="min-w-0">
          <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
            Predicted return
          </p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {formattedDate}
          </p>
          {sampleNote ? (
            <p className="mt-1 text-caption text-muted-foreground">{sampleNote}</p>
          ) : null}
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="min-h-11 w-full touch-manipulation sm:min-h-10 sm:w-auto"
        onClick={() => onJumpToDay(predicted_next_date)}
      >
        Jump to this day
      </Button>
    </div>
  );
}
