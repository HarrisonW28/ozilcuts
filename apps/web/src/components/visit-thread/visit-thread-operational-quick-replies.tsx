"use client";

import {
  partitionGuestOperationalQuickReplies,
  partitionShopOperationalQuickReplies,
  type VisitThreadQuickReplyGroup,
} from "@/lib/visit-thread-quick-reply-groups";
import { Button, cn } from "@ozilcuts/ui";

type VisitThreadOperationalQuickRepliesProps = {
  operationalKeys: string[];
  labelMap: Record<string, string>;
  isShopSide: boolean;
  inArrivalMessagingWindow: boolean;
  sending: boolean;
  onSendOperational: (key: string) => void;
};

function groupLayoutClass(group: VisitThreadQuickReplyGroup): string {
  if (group.id === "late") {
    return cn(
      "flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]",
      "sm:flex-wrap sm:overflow-visible",
    );
  }
  return "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4";
}

function chipClass(group: VisitThreadQuickReplyGroup): string {
  return cn(
    "min-h-12 w-full touch-manipulation justify-center px-2 text-center text-xs font-semibold leading-snug sm:min-h-11 sm:text-sm",
    group.id === "late" &&
      "snap-center shrink-0 basis-[min(100%,11.5rem)] min-[420px]:basis-auto sm:shrink sm:flex-1",
  );
}

export function VisitThreadOperationalQuickReplies({
  operationalKeys,
  labelMap,
  isShopSide,
  inArrivalMessagingWindow,
  sending,
  onSendOperational,
}: VisitThreadOperationalQuickRepliesProps) {
  if (operationalKeys.length === 0) return null;

  const groups = isShopSide
    ? partitionShopOperationalQuickReplies(operationalKeys)
    : partitionGuestOperationalQuickReplies(operationalKeys);

  return (
    <fieldset className="min-w-0 space-y-4 border-0 p-0">
      <legend className="mb-1 w-full text-micro font-semibold uppercase tracking-wide text-muted-foreground">
        {inArrivalMessagingWindow
          ? "Arrival, parking & ETA"
          : "One-tap operational replies"}
      </legend>
      <p className="text-caption leading-relaxed text-muted-foreground">
        {inArrivalMessagingWindow
          ? "Short, practical lines — arriving now, parked nearby, outside, or a soft ETA update."
          : "Fastest taps first — each sends a short, booking-only line to the thread."}
      </p>
      <div className="space-y-4">
        {groups.map((group, gi) => (
          <div key={group.id} className="min-w-0 space-y-2">
            <h4 className="text-micro font-semibold uppercase tracking-wide text-foreground/85">
              {group.title}
            </h4>
            <div className={groupLayoutClass(group)} role="list">
              {group.keys.map((key) => (
                <Button
                  key={key}
                  type="button"
                  variant={gi === 0 ? "default" : "secondary"}
                  disabled={sending}
                  className={chipClass(group)}
                  aria-label={labelMap[key] ?? key}
                  onClick={() => onSendOperational(key)}
                >
                  {labelMap[key] ?? key}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
