"use client";

import type { AppointmentThreadMessage } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";

import {
  formatVisitThreadTime,
  isVisitThreadEntryUnreadForViewer,
  visitThreadKindLabel,
  visitThreadSenderLabel,
} from "./visit-thread-display";

type VisitThreadLogEntryProps = {
  msg: AppointmentThreadMessage;
  viewerUserId: number;
  viewerLastReadMessageId: number | null;
};

export function VisitThreadLogEntry({
  msg,
  viewerUserId,
  viewerLastReadMessageId,
}: VisitThreadLogEntryProps) {
  const isOp = msg.kind === "operational";
  const isPreset = msg.kind === "preset";
  const isPending = msg.id < 0;
  const isCalmArrivalAuto =
    isOp && (msg.operational_key ?? "").startsWith("arrival_auto_");
  const unread = isVisitThreadEntryUnreadForViewer(
    msg,
    viewerUserId,
    viewerLastReadMessageId,
  );
  const kind = visitThreadKindLabel(msg);

  return (
    <li>
      <article
        className={cn(
          "rounded-xl px-3 py-2.5 sm:px-3.5 sm:py-3",
          isPending && "motion-safe:opacity-90",
          isOp &&
            (isCalmArrivalAuto
              ? "border border-teal-500/20 border-l-4 border-l-teal-500/50 bg-teal-500/[0.04] dark:border-teal-500/25 dark:bg-teal-500/[0.07]"
              : "border border-primary/20 border-l-4 border-l-primary/60 bg-primary/[0.04] dark:border-primary/25 dark:bg-primary/[0.06]"),
          isPreset &&
            "border border-amber-500/25 border-l-4 border-l-amber-500/70 bg-amber-500/[0.05] dark:bg-amber-500/[0.08]",
          !isOp &&
            !isPreset &&
            "border border-border/55 bg-muted/15 dark:bg-muted/20",
        )}
        aria-busy={isPending}
        aria-label={`${visitThreadSenderLabel(msg, viewerUserId)}, ${kind}${unread ? ", unread" : ""}${isPending ? ", sending" : ""}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {visitThreadSenderLabel(msg, viewerUserId)}
              <span className="ms-1.5 font-normal text-muted-foreground">
                · {kind.toLowerCase()}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {unread ? (
              <span className="rounded-full bg-primary/18 px-2 py-0.5 text-micro font-semibold uppercase tracking-wide text-primary">
                Unread
              </span>
            ) : null}
            {isPending ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-micro font-medium text-muted-foreground">
                Sending…
              </span>
            ) : null}
            <time
              className="text-caption tabular-nums text-muted-foreground"
              dateTime={msg.created_at ?? undefined}
            >
              {formatVisitThreadTime(msg.created_at)}
            </time>
          </div>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {msg.body}
        </p>
      </article>
    </li>
  );
}
