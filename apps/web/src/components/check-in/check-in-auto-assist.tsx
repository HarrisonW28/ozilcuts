"use client";

import { CheckInTapButton } from "@/components/check-in/check-in-tap-button";
import { canOfferAutoCheckIn } from "@/lib/check-in-flow";
import type { AppointmentRecord } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";
import { Navigation, Sparkles } from "lucide-react";

type CheckInAutoAssistProps = {
  appointment: AppointmentRecord;
  arrivalLocationOptIn: boolean | null;
  busy: boolean;
  autoCheckInBusy: boolean;
  disabled?: boolean;
  onCheckIn: () => void;
  className?: string;
};

/**
 * Primary one-tap check-in with calm auto-assist hint (geofence handled separately).
 */
export function CheckInAutoAssist({
  appointment,
  arrivalLocationOptIn,
  busy,
  autoCheckInBusy,
  disabled,
  onCheckIn,
  className,
}: CheckInAutoAssistProps) {
  const autoAvailable = canOfferAutoCheckIn(appointment, arrivalLocationOptIn);

  return (
    <div className={cn("check-in-auto-assist space-y-3", className)}>
      <CheckInTapButton
        busy={busy || autoCheckInBusy}
        disabled={disabled}
        onCheckIn={onCheckIn}
      />

      {autoCheckInBusy ? (
        <div
          className="check-in-auto-banner"
          role="status"
          aria-live="polite"
        >
          <Navigation className="size-4 shrink-0 motion-safe:animate-pulse" aria-hidden />
          <p className="text-sm font-medium text-foreground">
            Checking you in automatically…
          </p>
        </div>
      ) : null}

      {!autoCheckInBusy && autoAvailable ? (
        <div className="check-in-auto-banner check-in-auto-banner--hint">
          <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
          <p className="text-caption leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Auto check-in is on</span>
            {" — "}
            keep this page open when you are nearby and we will tap you in at the
            door. Manual check-in above always works.
          </p>
        </div>
      ) : null}

      {!autoCheckInBusy && arrivalLocationOptIn === false ? (
        <p className="text-center text-caption text-muted-foreground sm:text-left">
          Prefer hands-free? Enable arrival location sharing in your profile for
          optional auto check-in near the studio.
        </p>
      ) : null}
    </div>
  );
}
