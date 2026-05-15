"use client";

import { NotificationGlyph } from "@/components/notification-glyph";
import {
  getNotificationDisplayTitle,
  getNotificationShortLine,
  isOperationalAlertType,
} from "@/lib/notification-presenter";
import {
  pickPriorityOperationalAlert,
  shouldSuppressOperationalAlerts,
} from "@/lib/operational-presence";
import { useInbox } from "@/lib/use-inbox";
import type { NotificationRecord } from "@ozilcuts/types";
import { Button, cn } from "@ozilcuts/ui";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

type PresenceOperationalAlertProps = {
  className?: string;
  digestMessage?: string | null;
  digestShownAtMs?: number | null;
};

export function PresenceOperationalAlert({
  className,
  digestMessage = null,
  digestShownAtMs = null,
}: PresenceOperationalAlertProps) {
  const inbox = useInbox();

  if (!inbox.enabled) return null;
  if (shouldSuppressOperationalAlerts(digestMessage, digestShownAtMs)) {
    return null;
  }

  const lead: NotificationRecord | null = pickPriorityOperationalAlert(inbox.latest);
  if (!lead) return null;

  const operationalUnread = inbox.latest.filter(
    (n) => n.read_at === null && isOperationalAlertType(n.type),
  );
  const totalUnread = operationalUnread.length;

  return (
    <section
      className={cn("presence-operational-alert", className)}
      aria-label="Operational alert"
    >
      <div className="flex gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/15 text-amber-800 dark:text-amber-100">
          <AlertTriangle className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-micro font-semibold uppercase tracking-wide text-amber-900/80 dark:text-amber-100/90">
            {totalUnread === 1 ? "Needs attention" : `${totalUnread} shop alerts`}
          </p>
          <div className="flex items-start gap-2">
            <NotificationGlyph type={lead.type} compact className="!size-8" />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug text-foreground">
                {getNotificationDisplayTitle(lead)}
              </p>
              <p className="line-clamp-2 text-caption text-muted-foreground">
                {getNotificationShortLine(lead)}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm" className="min-h-10 touch-manipulation">
          <Link href="/notifications?filter=operational">Open alerts</Link>
        </Button>
      </div>
    </section>
  );
}
