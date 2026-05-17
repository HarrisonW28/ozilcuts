"use client";

import { HomeBackgroundVideo } from "@/components/home/background-video";
import { useHomeVideoAutoplay } from "@/hooks/use-home-video-autoplay";
import type { HomeVideoSources } from "@/lib/home-video-config";
import { cn } from "@ozilcuts/ui";
import type { ReactNode } from "react";

type HomeCinematicHeroProps = {
  children: ReactNode;
  className?: string;
  videoSources?: HomeVideoSources;
};

/**
 * Full-bleed hero shell: video backdrop (same bounds as shell) with text/CTAs above.
 */
export function HomeCinematicHero({
  children,
  className,
  videoSources,
}: HomeCinematicHeroProps) {
  const autoplay = useHomeVideoAutoplay({ enabled: true });
  const { allowMotion } = autoplay;

  return (
    <div
      ref={autoplay.containerRef}
      className={cn("home-cinematic-hero-shell", className)}
    >
      <div className="home-cinematic-hero-backdrop" aria-hidden>
        <HomeBackgroundVideo
          variant="hero"
          autoplay={autoplay}
          sources={videoSources}
        />
        <div className="home-cinematic-hero-overlay" />
        <div className="home-cinematic-hero-gradient-main" />
        <div className="home-cinematic-hero-gradient-glow" />
        <div className="home-cinematic-hero-gradient-floor" />
        {!allowMotion ? (
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
