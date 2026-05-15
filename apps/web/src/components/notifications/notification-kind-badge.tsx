"use client";

import {
  notificationCategoryLabel,
  notificationVisualKind,
} from "@/lib/notification-presenter";
import type { NotificationEvent } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";

type NotificationKindBadgeProps = {
  type: NotificationEvent;
  className?: string;
};

export function NotificationKindBadge({
  type,
  className,
}: NotificationKindBadgeProps) {
  const kind = notificationVisualKind(type);
  const label = notificationCategoryLabel(kind);

  return (
    <span
      className={cn(
        "notification-kind-badge",
        (kind === "operational" || kind === "messaging_staff") &&
          "notification-kind-badge--operational",
        kind === "reminder" && "notification-kind-badge--reminder",
        kind === "proximity" && "notification-kind-badge--proximity",
        className,
      )}
    >
      {label}
    </span>
  );
}
