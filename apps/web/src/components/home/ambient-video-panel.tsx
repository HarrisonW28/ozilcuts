"use client";

import { HomeBackgroundVideo } from "@/components/home/background-video";
import {
  heroBundleHasVideo,
  resolveAmbientBundle,
  type HomeVideoSources,
} from "@/lib/home-video-config";
import { cn } from "@ozilcuts/ui";
import { useMemo } from "react";

type HomeAmbientVideoPanelProps = {
  className?: string;
  sources?: HomeVideoSources;
};

/**
 * Small ambient loop for gallery rows — only renders when the shop has uploaded hero video.
 */
export function HomeAmbientVideoPanel({
  className,
  sources,
}: HomeAmbientVideoPanelProps) {
  const bundle = useMemo(() => {
    if (!sources) return null;
    return resolveAmbientBundle(sources);
  }, [sources]);

  if (!bundle || !heroBundleHasVideo(bundle)) {
    return null;
  }

  return (
    <HomeBackgroundVideo
      variant="ambient"
      sources={sources}
      className={cn(
        "min-h-[8rem] overflow-hidden rounded-2xl bg-gradient-to-br from-muted/50 to-muted/15 ring-1 ring-border/50 dark:from-muted/30 dark:to-muted/10",
        className,
      )}
    />
  );
}
