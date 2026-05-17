"use client";

import { NotificationGlyph } from "@/components/notification-glyph";
import { NotificationKindBadge } from "@/components/notifications/notification-kind-badge";
import { NotificationMetaChips } from "@/components/notifications/notification-meta-chips";
import {
  formatRelativeNotificationTime,
  getNotificationBody,
  getNotificationDisplayTitle,
  getNotificationShortLine,
  notificationAccentClass,
  notificationVisualKind,
} from "@/lib/notification-presenter";
import type { NotificationRecord } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";
import type { ReactNode } from "react";

export type NotificationCardVariant = "inbox" | "popover" | "home";

type NotificationCardProps = {
  record: NotificationRecord;
  variant?: NotificationCardVariant;
  unread?: boolean;
  staggerMs?: number;
  className?: string;
  footer?: ReactNode;
};

export function NotificationCard({
  record,
  variant = "inbox",
  unread = record.read_at === null,
  staggerMs = 0,
  className,
  footer,
}: NotificationCardProps) {
  const kind = notificationVisualKind(record.type);
  const accent = notificationAccentClass(kind);
  const compact = variant === "popover" || variant === "home";

  return (
    <article
      className={cn(
        "motion-notification-row overflow-hidden",
        variant === "inbox" &&
          "rounded-2xl border border-border/55 shadow-sm transition-[box-shadow,transform] duration-brand ease-brand motion-safe:hover:-translate-y-px motion-safe:hover:shadow-md dark:border-border/45",
        accent,
        unread && variant === "inbox" && "ring-1 ring-primary/20 dark:ring-primary/25",
        className,
      )}
      style={{ animationDelay: `${staggerMs}ms` }}
      aria-label={unread ? "Unread notification" : undefined}
    >
      <div
        className={cn(
          "flex gap-3",
          compact ? "p-3" : "p-4 sm:gap-4 sm:p-5",
        )}
      >
        <NotificationGlyph type={record.type} compact={compact} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <NotificationKindBadge type={record.type} />
                {unread ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-2 py-0.5 text-micro font-semibold uppercase tracking-wide text-primary">
                    <span className="notification-unread-dot" aria-hidden />
                    New
                  </span>
                ) : null}
              </div>
              <h3
                className={cn(
                  "font-semibold leading-snug tracking-tight text-foreground",
                  compact ? "text-sm" : "text-base",
                )}
              >
                {getNotificationDisplayTitle(record)}
              </h3>
            </div>
          </div>
          <p className="text-caption text-muted-foreground">
            {formatRelativeNotificationTime(record.created_at)}
          </p>
          <NotificationMetaChips record={record} />
          <p
            className={cn(
              "leading-relaxed text-foreground/95",
              compact ? "line-clamp-2 text-xs" : "text-sm",
            )}
          >
            {variant === "home"
              ? getNotificationShortLine(record)
              : getNotificationBody(record)}
          </p>
        </div>
      </div>
      {footer ? (
        <footer className="border-t border-border/35 bg-muted/[0.08] px-4 py-3 dark:bg-muted/10 sm:px-5">
          {footer}
        </footer>
      ) : null}
    </article>
  );
}
