"use client";

import { hapticTouch } from "@/lib/haptics";
import { Button, cn } from "@ozilcuts/ui";
import { MapPin } from "lucide-react";

type CheckInTapButtonProps = {
  busy: boolean;
  disabled?: boolean;
  onCheckIn: () => void;
  className?: string;
};

export function CheckInTapButton({
  busy,
  disabled,
  onCheckIn,
  className,
}: CheckInTapButtonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <Button
        type="button"
        size="lg"
        className="check-in-tap-button"
        disabled={disabled || busy}
        onPointerDown={(ev) => {
          if (disabled || busy) return;
          hapticTouch("medium", ev.pointerType);
        }}
        onClick={onCheckIn}
      >
        <MapPin className="mr-2 size-5 shrink-0" aria-hidden />
        {busy ? "Checking you in…" : "Tap to check in"}
      </Button>
      <p className="text-center text-caption leading-relaxed text-muted-foreground sm:text-left">
        One tap when you walk through the door — we will take it from there.
      </p>
    </div>
  );
}
