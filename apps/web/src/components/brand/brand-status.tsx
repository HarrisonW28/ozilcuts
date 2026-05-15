"use client";

import { cn } from "@ozilcuts/ui";
import type { ReactNode } from "react";

type BrandStatusTone = "neutral" | "accent" | "success" | "warning" | "info";

type BrandStatusProps = {
  tone?: BrandStatusTone;
  children: ReactNode;
  className?: string;
};

const toneClass: Record<BrandStatusTone, string> = {
  neutral: "border-border/50 bg-muted/30 text-muted-foreground",
  accent: "brand-accent-chip",
  success:
    "border-[color-mix(in_oklch,var(--brand-success)_40%,transparent)] bg-[var(--brand-success-muted)] text-foreground",
  warning:
    "border-[color-mix(in_oklch,var(--brand-warning)_40%,transparent)] bg-[var(--brand-warning-muted)] text-foreground",
  info: "border-[color-mix(in_oklch,var(--brand-info)_40%,transparent)] bg-[var(--brand-info-muted)] text-foreground",
};

/** Semantic status chip using brand colour roles. */
export function BrandStatus({
  tone = "neutral",
  children,
  className,
}: BrandStatusProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-micro font-semibold uppercase tracking-widecaps",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
