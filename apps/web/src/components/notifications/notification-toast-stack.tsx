"use client";

import { NotificationGlyph } from "@/components/notification-glyph";
import { NotificationKindBadge } from "@/components/notifications/notification-kind-badge";
import { NotificationMetaChips } from "@/components/notifications/notification-meta-chips";
import {
  formatRelativeNotificationTime,
  getNotificationDisplayTitle,
  getNotificationShortLine,
  notificationAccentClass,
  notificationVisualKind,
  notificationPrimaryHref,
  primaryActionLabel,
  toastDurationMs,
} from "@/lib/notification-presenter";
import type { NotificationRecord } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";
import Link from "next/link";
import { useEffect } from "react";

type NotificationToastStackProps = {
  items: NotificationRecord[];
  onDismiss: (id: number) => void;
  onMarkRead: (id: number) => void;
};

export function NotificationToastStack({
  items,
  onDismiss,
  onMarkRead,
}: NotificationToastStackProps) {
  useEffect(() => {
    if (items.length === 0) return;
    const timers = items.map((row) =>
      window.setTimeout(() => onDismiss(row.id), toastDurationMs(row)),
    );
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [items, onDismiss]);

  if (items.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Recent notifications"
      aria-live="polite"
      className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom,0px))] left-4 right-4 z-[60] flex flex-col-reverse gap-2.5 sm:left-auto sm:w-[22.5rem]"
    >
      {items.map((row, idx) => {
        const href = notificationPrimaryHref(row);
        const kind = notificationVisualKind(row.type);
        const accent = notificationAccentClass(kind);
        const duration = toastDurationMs(row);

        return (
          <div
            key={row.id}
            role="status"
            className={cn(
              "motion-toast pointer-events-auto relative overflow-hidden rounded-xl border border-border/60 bg-background/95 shadow-xl backdrop-blur-md dark:border-border/50 dark:bg-background/90",
              accent,
            )}
            style={{
              animationDelay: `${idx * 70}ms`,
              ["--toast-duration" as string]: `${duration}ms`,
            }}
          >
            <div
              className="notification-toast-progress"
              aria-hidden
            />
            <div className="flex gap-3 p-3.5">
              <NotificationGlyph type={row.type} compact />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <NotificationKindBadge type={row.type} />
                </div>
                <p className="text-sm font-semibold leading-snug text-foreground">
                  {getNotificationDisplayTitle(row)}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {getNotificationShortLine(row)}
                </p>
                <NotificationMetaChips record={row} className="mt-1.5" />
                <p className="mt-1 text-[11px] text-muted-foreground/85">
                  {formatRelativeNotificationTime(row.created_at)}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  {href ? (
                    <Link
                      href={href}
                      className="font-semibold text-primary underline-offset-4 hover:underline"
                      onClick={() => {
                        void onMarkRead(row.id);
                        onDismiss(row.id);
                      }}
                    >
                      {primaryActionLabel(row)}
                    </Link>
                  ) : null}
                  <Link
                    href="/notifications"
                    className="font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    onClick={() => onDismiss(row.id)}
                  >
                    Inbox
                  </Link>
                </div>
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                className="motion-interactive -mr-1 -mt-1 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                onClick={() => onDismiss(row.id)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
