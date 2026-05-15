"use client";

import {
  type OperationalStatus,
  operationalStatusMeta,
} from "@/lib/shop-live-status";
import { cn } from "@ozilcuts/ui";

type OperationalStatusChipProps = {
  status: OperationalStatus;
  className?: string;
  /** When true, show the short label (dense rows). */
  compact?: boolean;
};

function toneStyles(
  tone: ReturnType<typeof operationalStatusMeta>["tone"],
): string {
  switch (tone) {
    case "success":
      return "border-emerald-500/35 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100";
    case "info":
      return "border-sky-500/35 bg-sky-500/10 text-sky-950 dark:text-sky-100";
    case "attention":
      return "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-50";
    case "muted":
      return "border-border/60 bg-muted/30 text-muted-foreground";
    default:
      return "border-border/55 bg-muted/20 text-foreground/90";
  }
}

export function OperationalStatusChip({
  status,
  className,
  compact,
}: OperationalStatusChipProps) {
  const meta = operationalStatusMeta(status);
  const label = compact ? meta.short : meta.label;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-micro font-semibold uppercase tracking-widecaps",
        toneStyles(meta.tone),
        className,
      )}
    >
      {label}
    </span>
  );
}
