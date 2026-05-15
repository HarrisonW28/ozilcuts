"use client";

import type { NotificationEvent } from "@ozilcuts/types";
import type { ComponentType, SVGProps } from "react";
import {
  BellRing,
  CalendarCheck2,
  CalendarClock,
  CalendarX2,
  ClipboardList,
  Sparkles,
  Timer,
  UserMinus,
  UserPlus,
  UserCheck,
  MapPin,
  MessageCircle,
} from "lucide-react";

import { cn } from "@ozilcuts/ui";

import { notificationVisualKind } from "@/lib/notification-presenter";

const GLYPHS: Record<
  NotificationEvent,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  "appointment.confirmed": CalendarCheck2,
  "appointment.cancelled": CalendarX2,
  "appointment.rescheduled": CalendarClock,
  "appointment.reminder": BellRing,
  "appointment.running_late": Timer,
  "appointment.rebook_suggested": Sparkles,
  "appointment.inactivity_nudge": Sparkles,
  "appointment.arrival_nearby": MapPin,
  "appointment.visit_message": MessageCircle,
  "staff.booking.created": UserPlus,
  "staff.booking.cancelled": UserMinus,
  "staff.booking.rescheduled": ClipboardList,
  "staff.arrival_nearby": MapPin,
  "staff.arrival_checked_in": UserCheck,
  "staff.visit_message": MessageCircle,
};

function glyphToneClass(type: NotificationEvent): string {
  const kind = notificationVisualKind(type);
  switch (kind) {
    case "operational":
      return "text-amber-700 dark:text-amber-200";
    case "retention":
      return "text-violet-700 dark:text-violet-200";
    case "reminder":
      return "text-sky-700 dark:text-sky-200";
    case "proximity":
      return "text-teal-700 dark:text-teal-200";
    default:
      return "text-primary";
  }
}

type NotificationGlyphProps = {
  type: NotificationEvent;
  /** Tighter footprint for bell popover rows. */
  compact?: boolean;
  className?: string;
};

export function NotificationGlyph({
  type,
  compact,
  className,
}: NotificationGlyphProps) {
  const Icon = GLYPHS[type] ?? BellRing;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl border border-border/50 bg-background/80 shadow-xs dark:bg-background/50",
        compact ? "size-8" : "size-9",
        glyphToneClass(type),
        className,
      )}
      aria-hidden
    >
      <Icon
        className={compact ? "size-4" : "size-[1.125rem]"}
        strokeWidth={2}
        aria-hidden
      />
    </span>
  );
}
