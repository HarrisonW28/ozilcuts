"use client";

import { NotificationToastStack } from "@/components/notifications";
import { useInbox } from "@/lib/use-inbox";

const MAX_VISIBLE = 2;

export function NotificationsToaster() {
  const { newArrivals, dismissArrival, markRead } = useInbox();
  const visible = newArrivals.slice(0, MAX_VISIBLE);

  return (
    <NotificationToastStack
      items={visible}
      onDismiss={dismissArrival}
      onMarkRead={(id) => void markRead(id)}
    />
  );
}
