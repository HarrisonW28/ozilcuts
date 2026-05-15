"use client";

import { HomeBackgroundVideo } from "@/components/home/background-video";
import { cn } from "@ozilcuts/ui";

type HomeAmbientVideoPanelProps = {
  className?: string;
};

/**
 * Small ambient loop for gallery / texture rows — loads only in view, muted,
 * and respects Save-Data + reduced motion (falls back to a static gradient).
 */
export function HomeAmbientVideoPanel({ className }: HomeAmbientVideoPanelProps) {
  return (
    <HomeBackgroundVideo
      variant="ambient"
      className={cn(
        "min-h-[8rem] overflow-hidden rounded-2xl bg-gradient-to-br from-muted/50 to-muted/15 ring-1 ring-border/50 dark:from-muted/30 dark:to-muted/10",
        className,
      )}
    />
  );
}
