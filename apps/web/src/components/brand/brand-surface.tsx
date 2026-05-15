"use client";

import {
  brandElevation,
  type BrandElevationLevel,
} from "@/lib/brand";
import { cn } from "@ozilcuts/ui";
import type { ElementType, ReactNode } from "react";

type BrandSurfaceTone = "default" | "raised" | "muted" | "accent" | "dashboard";

type BrandSurfaceProps = {
  as?: ElementType;
  elevation?: BrandElevationLevel;
  tone?: BrandSurfaceTone;
  interactive?: boolean;
  className?: string;
  children: ReactNode;
};

const toneClass: Record<BrandSurfaceTone, string> = {
  default: "bg-card text-card-foreground border border-border/60",
  raised:
    "bg-popover text-popover-foreground border border-border/50 shadow-elev-2",
  muted: "bg-muted/40 text-foreground border border-border/40",
  accent:
    "border border-[color-mix(in_oklch,var(--brand-accent)_35%,transparent)] bg-[var(--brand-accent-muted)] text-foreground",
  dashboard: "dashboard-surface",
};

/**
 * Elevated panel with brand-consistent borders and optional press/hover motion.
 */
export function BrandSurface({
  as: Component = "div",
  elevation = 1,
  tone = "default",
  interactive = false,
  className,
  children,
}: BrandSurfaceProps) {
  return (
    <Component
      className={cn(
        "rounded-2xl",
        toneClass[tone],
        elevation > 0 && tone !== "dashboard" && brandElevation[elevation],
        interactive && "brand-pressable motion-card cursor-pointer",
        className,
      )}
    >
      {children}
    </Component>
  );
}
