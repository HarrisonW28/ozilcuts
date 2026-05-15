"use client";

import { formatQueueSyncTime } from "@/lib/queue-intelligence";
import { cn } from "@ozilcuts/ui";
import { RefreshCw, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

type QueueLiveSyncStripProps = {
  active: boolean;
  lastSyncedAt: number | null;
  syncing: boolean;
  className?: string;
};

export function QueueLiveSyncStrip({
  active,
  lastSyncedAt,
  syncing,
  className,
}: QueueLiveSyncStripProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) return null;

  const label = syncing
    ? "Refreshing queue gently…"
    : lastSyncedAt
      ? `Queue updated ${formatQueueSyncTime(lastSyncedAt, nowMs)}`
      : "Connecting for live queue updates…";

  return (
    <p
      className={cn("queue-live-sync-strip", className)}
      role="status"
      aria-live="polite"
    >
      {syncing ? (
        <RefreshCw className="size-3.5 shrink-0 motion-safe:animate-spin" aria-hidden />
      ) : (
        <Wifi className="size-3.5 shrink-0 opacity-70" aria-hidden />
      )}
      {label}
    </p>
  );
}
