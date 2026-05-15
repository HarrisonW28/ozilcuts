"use client";

import { PresenceCheckedInChip } from "@/components/presence/presence-checked-in-chip";
import { PresenceFlowTracker } from "@/components/presence/presence-flow-tracker";
import type { FloorPresenceGuest } from "@/lib/operational-presence";
import { cn } from "@ozilcuts/ui";
import Link from "next/link";

type PresenceGuestListProps = {
  guests: FloorPresenceGuest[];
  className?: string;
};

export function PresenceGuestList({ guests, className }: PresenceGuestListProps) {
  if (guests.length === 0) return null;

  return (
    <section className={cn(className)} aria-labelledby="presence-guest-list-heading">
      <h3
        id="presence-guest-list-heading"
        className="mb-2 text-micro font-semibold uppercase tracking-wide text-muted-foreground"
      >
        On the floor now
      </h3>
      <ul className="presence-guest-list">
        {guests.map((g) => (
          <li key={g.appointmentId}>
            <Link
              href={`/appointments/${g.appointmentId}/check-in`}
              className="presence-guest-row motion-interactive hover:bg-muted/20"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {g.name}
                  </p>
                  <PresenceCheckedInChip state={g.state} />
                </div>
                {g.serviceName ? (
                  <p className="truncate text-caption text-muted-foreground">{g.serviceName}</p>
                ) : null}
                <PresenceFlowTracker state={g.state} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
