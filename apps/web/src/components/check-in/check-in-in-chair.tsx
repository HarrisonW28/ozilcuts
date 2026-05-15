"use client";

import { Armchair } from "lucide-react";

export function CheckInInChair() {
  return (
    <div className="check-in-chair-card" role="status">
      <Armchair
        className="mx-auto mb-3 size-8 text-primary"
        strokeWidth={1.75}
        aria-hidden
      />
      <p className="text-base font-semibold text-foreground">
        You are in the chair
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Relax and enjoy the session — your barber has everything they need.
      </p>
    </div>
  );
}
