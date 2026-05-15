"use client";

import { PresenceDigestBanner } from "@/components/presence/presence-digest-banner";
import { PresenceFloorStrip } from "@/components/presence/presence-floor-strip";
import { PresenceGuestList } from "@/components/presence/presence-guest-list";
import { PresenceOperationalAlert } from "@/components/presence/presence-operational-alert";
import { PresenceReadyToggle } from "@/components/presence/presence-ready-toggle";
import type { FloorPresenceCounts, FloorPresenceGuest } from "@/lib/operational-presence";
import { cn } from "@ozilcuts/ui";

export type PresencePanelProps = {
  userId: number;
  digestMessage: string | null;
  digestShownAtMs: number | null;
  onDismissDigest: () => void;
  onReadyChange?: (ready: boolean) => void;
  floorCounts: FloorPresenceCounts;
  floorGuests: FloorPresenceGuest[];
  className?: string;
};

/**
 * Barber operational presence: digest, ready state, floor counts, guest flow,
 * and a single deduped operational alert (avoids notification overload).
 */
export function PresencePanel({
  userId,
  digestMessage,
  digestShownAtMs,
  onDismissDigest,
  onReadyChange,
  floorCounts,
  floorGuests,
  className,
}: PresencePanelProps) {
  return (
    <div className={cn("presence-panel-stack", className)}>
      <PresenceDigestBanner message={digestMessage} onDismiss={onDismissDigest} />
      <PresenceReadyToggle userId={userId} onReadyChange={onReadyChange} />
      <PresenceFloorStrip counts={floorCounts} />
      <PresenceGuestList guests={floorGuests} />
      <PresenceOperationalAlert
        digestMessage={digestMessage}
        digestShownAtMs={digestShownAtMs}
      />
    </div>
  );
}
