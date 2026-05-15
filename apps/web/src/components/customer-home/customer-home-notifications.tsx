"use client";

import { CustomerHomeSection } from "@/components/customer-home/customer-home-section";
import { NotificationCard } from "@/components/notifications";
import { NotificationListSkeleton } from "@/components/loading";
import { notificationPrimaryHref } from "@/lib/notification-presenter";
import type { NotificationRecord } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  cn,
} from "@ozilcuts/ui";
import Link from "next/link";

type CustomerHomeNotificationsProps = {
  items: NotificationRecord[];
  unread: number;
  isLoading: boolean;
};

export function CustomerHomeNotifications({
  items,
  unread,
  isLoading,
}: CustomerHomeNotificationsProps) {
  return (
    <CustomerHomeSection
      id="home-notifications-heading"
      title="Notifications"
      badge={
        unread > 0 ? (
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
            {unread} unread
          </span>
        ) : undefined
      }
    >
      <Card className="dashboard-surface overflow-hidden">
        <CardContent className="space-y-3 px-0 py-0">
          {isLoading && items.length === 0 ? (
            <div className="px-4 py-4" aria-busy="true" aria-label="Loading notifications">
              <NotificationListSkeleton rows={3} className="gap-2" />
            </div>
          ) : items.length > 0 ? (
            <ul className="flex flex-col gap-2 px-2 py-2 sm:px-3">
              {items.map((row, idx) => {
                const href = notificationPrimaryHref(row) ?? "/notifications";
                return (
                  <li key={row.id}>
                    <Link
                      href={href}
                      className={cn(
                        "block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        row.read_at === null && "ring-1 ring-primary/15",
                      )}
                    >
                      <NotificationCard
                        record={row}
                        variant="home"
                        staggerMs={idx * 35}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-6">
              <p className="text-sm text-muted-foreground">
                {unread > 0
                  ? "You have unread updates — open the inbox."
                  : "You're all caught up. We'll surface reminders here."}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t border-border/40">
          <Button
            asChild
            variant="outline"
            className="min-h-12 w-full touch-manipulation sm:min-h-11"
          >
            <Link href="/notifications">Open inbox</Link>
          </Button>
        </CardFooter>
      </Card>
    </CustomerHomeSection>
  );
}
