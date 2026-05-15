"use client";

import { queuePaceIsBehind } from "@/lib/queue-intelligence";
import type { QueuePaceTone } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";
import { Leaf } from "lucide-react";

type QueueDelayNoticeProps = {
  mode: "customer" | "staff";
  visitsBehindSchedule: number;
  paceTone?: QueuePaceTone;
  className?: string;
};

export function QueueDelayNotice({
  mode,
  visitsBehindSchedule,
  paceTone,
  className,
}: QueueDelayNoticeProps) {
  if (!queuePaceIsBehind(paceTone, visitsBehindSchedule)) {
    return null;
  }

  const body =
    mode === "staff"
      ? "A few visits are easing back on schedule — guests on check-in see a calm heads-up."
      : "Today is moving a touch behind schedule. Arrive at your ease — we will catch up gently.";

  return (
    <p className={cn("queue-delay-notice", className)} role="status">
      <Leaf className="size-3.5 shrink-0 opacity-80" aria-hidden />
      <span>{body}</span>
    </p>
  );
}
