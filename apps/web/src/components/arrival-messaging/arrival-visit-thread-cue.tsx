import { MessageCircle } from "lucide-react";
import Link from "next/link";

import { cn } from "@ozilcuts/ui";

type ArrivalVisitThreadCueProps = {
  /** Element id of the thread section on the same page (e.g. `visit-thread`). */
  threadAnchorId: string;
  className?: string;
};

/**
 * Calm bridge from check-in / arrival UI to the booking thread — parking, ETA, outside, ready.
 */
export function ArrivalVisitThreadCue({
  threadAnchorId,
  className,
}: ArrivalVisitThreadCueProps) {
  return (
    <section
      aria-labelledby={`${threadAnchorId}-cue-heading`}
      className={cn(
        "rounded-xl border border-border/50 bg-muted/[0.35] px-4 py-3.5 dark:border-border/40 dark:bg-muted/20",
        className,
      )}
    >
      <div className="flex gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/[0.06] dark:bg-primary/[0.1]"
          aria-hidden
        >
          <MessageCircle className="size-5 text-primary" />
        </div>
        <div className="min-w-0 space-y-2 text-sm leading-relaxed">
          <h2
            id={`${threadAnchorId}-cue-heading`}
            className="font-semibold text-foreground"
          >
            Calm visit pings
          </h2>
          <p className="text-muted-foreground">
            Parking, outside, arriving now, or a quick ETA — use one-tap lines
            below so your barber (or guest) sees it in the same thread as
            check-in. Keep it short; no need for a novel.
          </p>
          <p>
            <Link
              href={`#${threadAnchorId}`}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Jump to visit thread
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
