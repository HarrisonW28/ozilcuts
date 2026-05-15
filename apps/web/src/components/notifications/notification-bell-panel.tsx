"use client";

import { NotificationGlyph } from "@/components/notification-glyph";
import {
  formatDayGroupHeading,
  formatRelativeNotificationTime,
  getNotificationDisplayTitle,
  getNotificationShortLine,
  notificationAccentClass,
  notificationCreatedDayKey,
  notificationPrimaryHref,
  notificationVisualKind,
  primaryActionLabel,
} from "@/lib/notification-presenter";
import type { NotificationRecord } from "@ozilcuts/types";
import { Button, cn } from "@ozilcuts/ui";
import Link from "next/link";

type NotificationBellPanelProps = {
  latest: NotificationRecord[];
  isLoading: boolean;
  error: string | null;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
  unread: number;
};

export function NotificationBellPanel({
  latest,
  isLoading,
  error,
  onMarkRead,
  onMarkAllRead,
  onClose,
  unread,
}: NotificationBellPanelProps) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-medium text-foreground">Notifications</span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={unread === 0}
          onClick={() => void onMarkAllRead()}
        >
          Mark all read
        </Button>
      </div>

      <div className="max-h-[min(50vh,calc(100dvh-14rem))] overflow-y-auto overscroll-y-contain sm:max-h-[60vh]">
        {error && latest.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {isLoading && latest.length === 0 ? (
          <div className="space-y-2 px-3 py-4" aria-busy="true" aria-label="Loading notifications">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-muted/40"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        ) : null}

        {!isLoading && latest.length === 0 && !error ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            You&rsquo;re all caught up.
          </p>
        ) : null}

        {latest.length > 0 ? (
          <ul className="divide-y divide-border/80">
            {latest.map((row, idx) => {
              const href = notificationPrimaryHref(row);
              const isUnread = row.read_at === null;
              const kind = notificationVisualKind(row.type);
              const accent = notificationAccentClass(kind);
              const dayKey = notificationCreatedDayKey(row.created_at);
              const prevKey =
                idx > 0
                  ? notificationCreatedDayKey(latest[idx - 1]!.created_at)
                  : null;
              const showDay = dayKey !== prevKey && dayKey !== "unknown";

              return (
                <li key={row.id}>
                  {showDay ? (
                    <div
                      className="bg-muted/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                      role="presentation"
                    >
                      {formatDayGroupHeading(dayKey)}
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      "px-2 py-2 motion-notification-row sm:px-3",
                      accent,
                    )}
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <div className="flex items-start gap-2.5 rounded-xl p-2 transition-colors hover:bg-muted/25">
                      <NotificationGlyph type={row.type} compact />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-foreground">
                            {getNotificationDisplayTitle(row)}
                          </p>
                          {isUnread ? (
                            <span
                              className="notification-unread-dot mt-1"
                              aria-label="Unread"
                            />
                          ) : null}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
                          {getNotificationShortLine(row)}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground/90">
                          {formatRelativeNotificationTime(row.created_at)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {href ? (
                            <Button
                              asChild
                              size="sm"
                              variant="secondary"
                              className="min-h-10 px-3 text-xs sm:h-7 sm:min-h-7 sm:px-2"
                            >
                              <Link
                                href={href}
                                onClick={() => {
                                  if (isUnread) void onMarkRead(row.id);
                                  onClose();
                                }}
                              >
                                {primaryActionLabel(row)}
                              </Link>
                            </Button>
                          ) : null}
                          {isUnread ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="min-h-10 px-3 text-xs sm:h-7 sm:min-h-7 sm:px-2"
                              onClick={() => void onMarkRead(row.id)}
                            >
                              Mark read
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <div className="border-t border-border px-3 py-1 sm:py-2">
        <Link
          href="/notifications"
          className="motion-interactive -mr-1 inline-flex min-h-11 w-full touch-manipulation items-center justify-end rounded-md py-2 pr-1 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onClose}
        >
          See all
        </Link>
      </div>
    </>
  );
}
