"use client";

import { NotificationCard } from "@/components/notifications/notification-card";
import { NotificationThreadGroup } from "@/components/notifications/notification-thread-group";
import { groupNotificationsForInbox } from "@/lib/notification-presenter";
import type { NotificationRecord } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";
import type { ReactNode } from "react";

type NotificationInboxListProps = {
  records: NotificationRecord[];
  className?: string;
  isRefreshing?: boolean;
  renderActions?: (record: NotificationRecord) => ReactNode;
};

export function NotificationInboxList({
  records,
  className,
  isRefreshing = false,
  renderActions,
}: NotificationInboxListProps) {
  const grouped = groupNotificationsForInbox(records);
  let rowIndex = 0;

  return (
    <div
      className={cn(
        "motion-content-in space-y-8",
        isRefreshing && "optimistic-pending",
        className,
      )}
      aria-busy={isRefreshing || undefined}
    >
      {grouped.map((group) => (
        <section
          key={group.dayKey}
          aria-labelledby={`notif-group-${group.dayKey}`}
          className="space-y-3"
        >
          <h2
            id={`notif-group-${group.dayKey}`}
            className="text-micro font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {group.heading}
          </h2>
          <ul className="flex flex-col gap-3 sm:gap-4">
            {group.entries.map((entry) => {
              const staggerMs = rowIndex * 45;
              rowIndex += 1;

              if (entry.kind === "thread") {
                return (
                  <li key={entry.threadKey}>
                    <NotificationThreadGroup
                      records={entry.records}
                      staggerMs={staggerMs}
                      renderActions={renderActions}
                    />
                  </li>
                );
              }

              return (
                <li key={entry.record.id}>
                  <NotificationCard
                    record={entry.record}
                    variant="inbox"
                    staggerMs={staggerMs}
                    footer={renderActions?.(entry.record)}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
