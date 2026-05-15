"use client";

import { notificationMetaChips } from "@/lib/notification-presenter";
import type { NotificationRecord } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";

type NotificationMetaChipsProps = {
  record: NotificationRecord;
  className?: string;
};

export function NotificationMetaChips({
  record,
  className,
}: NotificationMetaChipsProps) {
  const chips = notificationMetaChips(record);
  if (chips.length === 0) return null;

  return (
    <ul
      className={cn("flex flex-wrap gap-1.5", className)}
      aria-label="Notification details"
    >
      {chips.map((chip) => (
        <li key={chip.key}>
          <span
            className={cn(
              "notification-meta-chip",
              chip.emphasis && "notification-meta-chip--emphasis",
            )}
          >
            {chip.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
