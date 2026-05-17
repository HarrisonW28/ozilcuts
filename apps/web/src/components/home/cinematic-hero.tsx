"use client";

import { HomeBackgroundVideo } from "@/components/home/background-video";
import { useHomeVideoAutoplay } from "@/hooks/use-home-video-autoplay";
import {
  hasHeroVideo,
  type HomeVideoSources,
} from "@/lib/home-video-config";
import { cn } from "@ozilcuts/ui";
import type { ReactNode } from "react";

type HomeCinematicHeroProps = {
  children: ReactNode;
  className?: string;
  videoSources?: HomeVideoSources;
};

/**
 * Full-bleed hero shell: video backdrop (same bounds as shell) with text/CTAs above.
 * No video layer when the shop has not uploaded hero media.
 */
export function HomeCinematicHero({
  children,
  className,
  videoSources,
}: HomeCinematicHeroProps) {
  const showVideo = hasHeroVideo(
    videoSources ?? { desktop: null, mobile: null },
  );
  const autoplay = useHomeVideoAutoplay({ enabled: showVideo });
  const { allowMotion } = autoplay;

  return (
    <div
      ref={showVideo ? autoplay.containerRef : undefined}
      className={cn("home-cinematic-hero-shell", className)}
    >
      <div className="home-cinematic-hero-backdrop" aria-hidden>
        {showVideo ? (
          <HomeBackgroundVideo
            variant="hero"
            autoplay={autoplay}
            sources={videoSources}
          />
        ) : (
          <div className="home-video-fallback-hero" />
        )}
        <div className="home-cinematic-hero-overlay" />
        <div className="home-cinematic-hero-gradient-main" />
        <div className="home-cinematic-hero-gradient-glow" />
        <div className="home-cinematic-hero-gradient-floor" />
        {showVideo && !allowMotion ? (
          <p className="sr-only">
            Background motion is off — reduced motion, data saver, or a slow
            connection is active.
          </p>
        ) : null}
      </div>

      <div className="home-cinematic-hero-foreground">{children}</div>
    </div>
  );
}
