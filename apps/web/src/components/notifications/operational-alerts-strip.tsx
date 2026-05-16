"use client";

import { NotificationGlyph } from "@/components/notification-glyph";
import {
  getNotificationDisplayTitle,
  getNotificationShortLine,
  isOperationalPriorityRecord,
} from "@/lib/notification-presenter";
import { useInbox } from "@/lib/use-inbox";
import { Button, cn } from "@ozilcuts/ui";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

type OperationalAlertsStripProps = {
  className?: string;
};

/** Surfaces unread shop alerts for barbers above the operational home. */
export function OperationalAlertsStrip({ className }: OperationalAlertsStripProps) {
  const inbox = useInbox();
  const operationalUnread = inbox.latest.filter(
    (n) => n.read_at === null && isOperationalPriorityRecord(n),
  );
  const lead = operationalUnread[0];

  if (!inbox.enabled || operationalUnread.length === 0 || !lead) {
    return null;
  }

  return (
    <section
      className={cn("notification-operational-strip", className)}
      aria-label="Operational alerts"
    >
      <div className="flex gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/15 text-amber-800 dark:text-amber-100">
          <AlertTriangle className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-micro font-semibold uppercase tracking-wide text-amber-900/80 dark:text-amber-100/90">
            {operationalUnread.length === 1
              ? "Operational alert"
              : `${operationalUnread.length} operational alerts`}
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
        <Button
          asChild
          size="sm"
          variant="outline"
          className="min-h-10 touch-manipulation"
        >
          <Link href="/notifications">All inbox</Link>
        </Button>
      </div>
    </section>
  );
}
