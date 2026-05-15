"use client";

import type { AppointmentThreadMessage } from "@ozilcuts/types";

import { VisitThreadLogEntry } from "./visit-thread-log-entry";

type VisitThreadLogProps = {
  messages: AppointmentThreadMessage[];
  viewerUserId: number;
  viewerLastReadMessageId: number | null;
};

export function VisitThreadLog({
  messages,
  viewerUserId,
  viewerLastReadMessageId,
}: VisitThreadLogProps) {
  if (messages.length === 0) return null;

  return (
    <section aria-label="Visit thread log" className="min-w-0">
      <h3 className="mb-2 text-micro font-semibold uppercase tracking-wide text-muted-foreground">
        Thread log
      </h3>
      <ul className="max-h-[min(24rem,52dvh)] space-y-2.5 overflow-y-auto overscroll-contain pr-1 sm:max-h-[min(28rem,50dvh)] sm:space-y-3">
        {messages.map((msg) => (
          <VisitThreadLogEntry
            key={msg.id}
            msg={msg}
            viewerUserId={viewerUserId}
            viewerLastReadMessageId={viewerLastReadMessageId}
          />
        ))}
      </ul>
    </section>
  );
}
