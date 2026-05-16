"use client";

import { NotificationCard } from "@/components/notifications/notification-card";
import { NotificationGlyph } from "@/components/notification-glyph";
import {
  formatRelativeNotificationTime,
  getNotificationDisplayTitle,
  getNotificationShortLine,
  notificationAccentClass,
  notificationThreadKey,
  notificationVisualKind,
} from "@/lib/notification-presenter";
import type { NotificationRecord } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";
import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

type NotificationThreadGroupProps = {
  records: NotificationRecord[];
  staggerMs?: number;
  renderActions?: (record: NotificationRecord) => ReactNode;
  className?: string;
};

export function NotificationThreadGroup({
  records,
  staggerMs = 0,
  renderActions,
  className,
}: NotificationThreadGroupProps) {
  const [open, setOpen] = useState(false);
  const latest = records[0]!;
  const visitBundle =
    notificationThreadKey(latest)?.startsWith("visit_thread:") ?? false;
  const kind = notificationVisualKind(latest.type);
  const accent = notificationAccentClass(kind);
  const unreadCount = records.filter((r) => r.read_at === null).length;

  return (
    <div
      className={cn(
        "notification-thread-group motion-notification-row",
        accent,
        className,
      )}
      style={{ animationDelay: `${staggerMs}ms` }}
    >
      <button
        type="button"
        className="notification-thread-summary"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <NotificationGlyph type={latest.type} compact />
        <span className="min-w-0 flex-1 space-y-1 text-left">
          <span className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-muted/50 px-2 py-0.5 text-micro font-semibold tabular-nums text-muted-foreground">
              {records.length} {visitBundle ? "visit updates" : "updates"}
            </span>
            {unreadCount > 0 ? (
              <span className="notification-unread-dot" aria-label={`${unreadCount} unread`} />
            ) : null}
          </span>
          <span className="block text-sm font-semibold leading-snug text-foreground">
            {getNotificationDisplayTitle(latest)}
          </span>
          <span className="block line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {getNotificationShortLine(latest)}
          </span>
          <span className="block text-caption text-muted-foreground">
            Latest {formatRelativeNotificationTime(latest.created_at)}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <ul className="space-y-3 border-t border-border/40 px-3 py-3 sm:px-4">
          {records.map((row, idx) => (
            <li key={row.id}>
              <NotificationCard
                record={row}
                variant="inbox"
                staggerMs={idx * 30}
                footer={renderActions?.(row)}
              />
            </li>
          ))}
        </ul>
      ) : renderActions ? (
        <div className="border-t border-border/35 px-4 py-3 sm:px-5">
          {renderActions(latest)}
        </div>
      ) : null}
    </div>
  );
}
