"use client";

import type { AppointmentArrivalState } from "@ozilcuts/types";
import { Button } from "@ozilcuts/ui";
import { Armchair } from "lucide-react";

type CheckInStaffControlsProps = {
  state: AppointmentArrivalState;
  busy: boolean;
  onAdvance: (next: AppointmentArrivalState) => void;
};

export function CheckInStaffControls({
  state,
  busy,
  onAdvance,
}: CheckInStaffControlsProps) {
  if (state === "expected") {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        Waiting for your guest — they can tap check-in, scan the QR, or arrive
        via automatic check-in when nearby.
      </p>
    );
  }

  if (state === "arrived") {
    return (
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="min-h-12 w-full touch-manipulation sm:w-auto sm:min-w-[14rem]"
        disabled={busy}
        onClick={() => onAdvance("waiting")}
      >
        {busy ? "Updating…" : "Seat in waiting area"}
      </Button>
    );
  }

  if (state === "waiting") {
    return (
      <div className="flex w-full flex-col gap-3 sm:max-w-xl">
        <div
          className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3 dark:bg-amber-500/[0.08]"
          role="status"
        >
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
            Guest is waiting
          </p>
          <p className="mt-1 text-caption text-amber-900/90 dark:text-amber-100/85">
            When you are ready, bring them to the chair — their phone updates
            live.
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          className="min-h-12 w-full touch-manipulation sm:w-auto sm:min-w-[14rem]"
          disabled={busy}
          onClick={() => onAdvance("in_chair")}
        >
          <Armchair className="size-5" aria-hidden />
          {busy ? "Updating…" : "In the chair"}
        </Button>
      </div>
    );
  }

  if (state === "in_chair") {
    return (
      <p className="text-sm font-medium text-muted-foreground">
        Guest is in the chair — enjoy the visit.
      </p>
    );
  }

  return null;
}
