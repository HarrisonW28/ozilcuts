"use client";

import {
  appointmentScheduleBlockClassName,
  appointmentScheduleRedactedBlockClassName,
  type AppointmentScheduleBlockVariant,
} from "@/lib/appointment-schedule-block";
import type { BookingBlock } from "@/lib/calendar-week";
import { cn } from "@ozilcuts/ui";
import Link from "next/link";
import type { CSSProperties } from "react";

type AppointmentScheduleBookingBlockProps = {
  booking: BookingBlock;
  variant: AppointmentScheduleBlockVariant;
  style?: CSSProperties;
  className?: string;
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
};

export function AppointmentScheduleBookingBlock({
  booking,
  variant,
  style,
  className,
  active = false,
  onClick,
}: AppointmentScheduleBookingBlockProps) {
  const blockClass = cn(
    "absolute flex flex-col justify-start overflow-hidden",
    variant === "timeline"
      ? "min-h-12 touch-manipulation text-left sm:min-h-11"
      : "items-start px-0.5",
    booking.redacted
      ? appointmentScheduleRedactedBlockClassName(variant)
      : appointmentScheduleBlockClassName(booking.status, variant),
    active && !booking.redacted && "z-30 ring-2 ring-inset ring-primary",
    !booking.redacted &&
      "focus-visible:z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:opacity-[0.92]",
    className,
  );

  const inner =
    variant === "timeline" ? (
      <>
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {booking.timeLabel}
        </span>
        {!booking.redacted ? (
          <span className="mt-0.5 line-clamp-2 text-xs font-semibold leading-snug sm:text-sm">
            {booking.label}
          </span>
        ) : null}
      </>
    ) : (
      <span className="line-clamp-2 leading-snug tabular-nums">{booking.label}</span>
    );

  if (booking.redacted) {
    return (
      <div
        role="img"
        aria-label={booking.ariaLabel}
        title={booking.hoverTitle}
        className={blockClass}
        style={style}
        onClick={onClick}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={booking.href}
      aria-label={booking.ariaLabel}
      title={booking.hoverTitle}
      className={blockClass}
      style={style}
      onClick={onClick}
    >
      {inner}
    </Link>
  );
}
