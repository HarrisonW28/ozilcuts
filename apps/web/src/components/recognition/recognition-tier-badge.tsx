"use client";

import { tierPresentation } from "@/lib/customer-recognition";
import type { CustomerRecognitionTier } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";

type RecognitionTierBadgeProps = {
  tier: CustomerRecognitionTier;
  compact?: boolean;
  className?: string;
};

export function RecognitionTierBadge({
  tier,
  compact = false,
  className,
}: RecognitionTierBadgeProps) {
  const meta = tierPresentation(tier);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border font-semibold uppercase tracking-widecaps",
        compact
          ? "px-2 py-0.5 text-[10px] leading-tight"
          : "px-3 py-1 text-micro",
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
