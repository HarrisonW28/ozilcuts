import type { AppointmentStatus } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";

export type AppointmentScheduleBlockVariant = "timeline" | "week";

/**
 * Shared visual language for appointment blocks in calendars (barber ops).
 * Keeps timeline + week overview consistent and touch-friendly.
 */
export function appointmentScheduleBlockClassName(
  status: AppointmentStatus,
  variant: AppointmentScheduleBlockVariant = "timeline",
): string {
  const size =
    variant === "timeline"
      ? "rounded-xl px-2 py-1.5 text-xs leading-snug sm:text-sm"
      : "rounded-lg px-1.5 py-1 text-[0.65rem] font-semibold leading-tight sm:px-2 sm:text-[11px]";

  const interactive = cn(
    "motion-interactive border shadow-xs",
    "transition-[transform,box-shadow,background-color,border-color] duration-[var(--motion-duration-base)] ease-[var(--motion-ease-standard)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "motion-safe:active:scale-[0.99] max-sm:motion-safe:active:scale-[0.985]",
  );

  if (status === "cancelled") {
    return cn(
      interactive,
      size,
      "border-border/40 bg-muted/45 text-muted-foreground",
      "line-through decoration-muted-foreground/55",
    );
  }

  return cn(
    interactive,
    size,
    "border-border/40 bg-card text-card-foreground",
    "hover:z-20 hover:border-primary/40 hover:shadow-sm",
    "dark:border-border/35 dark:bg-card/95",
  );
}

/** Blocked slot for guests — time visible, no PII on the card face. */
export function appointmentScheduleRedactedBlockClassName(
  variant: AppointmentScheduleBlockVariant = "timeline",
): string {
  const size =
    variant === "timeline"
      ? "rounded-xl px-2 py-1.5 text-xs leading-snug sm:text-sm"
      : "rounded-lg px-1.5 py-1 text-[0.65rem] font-semibold leading-tight sm:px-2 sm:text-[11px]";

  return cn(
    size,
    "cursor-default border border-border/50 bg-muted/55 text-muted-foreground shadow-none",
    "bg-[repeating-linear-gradient(135deg,transparent,transparent_5px,color-mix(in_oklab,var(--border)_28%,transparent)_5px,color-mix(in_oklab,var(--border)_28%,transparent)_10px)]",
    "dark:border-border/45 dark:bg-muted/40",
  );
}
