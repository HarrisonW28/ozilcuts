"use client";

import { formatCheckInSyncTime } from "@/lib/check-in-flow";
import { cn } from "@ozilcuts/ui";
import { RefreshCw, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

type CheckInLiveSyncStripProps = {
  active: boolean;
  lastSyncedAt: number | null;
  syncing: boolean;
  className?: string;
};

export function CheckInLiveSyncStrip({
  active,
  lastSyncedAt,
  syncing,
  className,
}: CheckInLiveSyncStripProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) return null;

  const label = syncing
    ? "Syncing visit status…"
    : lastSyncedAt
      ? `Updated ${formatCheckInSyncTime(lastSyncedAt, nowMs)}`
      : "Connecting for live updates…";

  return (
    <p
      className={cn(
        "flex items-center justify-center gap-1.5 text-center text-caption text-muted-foreground sm:justify-start",
        className,
      )}
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
