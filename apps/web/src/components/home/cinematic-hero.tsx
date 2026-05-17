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
 * Full-bleed hero shell: deferred muted loop video and editorial gradients.
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
      <HomeBackgroundVideo
        variant="hero"
        autoplay={autoplay}
        sources={videoSources}
      />

      <div className="home-cinematic-hero-overlay" aria-hidden />

      <div
        className="home-cinematic-hero-gradient-main"
        aria-hidden
      />
      <div
        className="home-cinematic-hero-gradient-glow"
        aria-hidden
      />
      <div
        className="home-cinematic-hero-gradient-floor"
        aria-hidden
      />

      {!allowMotion ? (
        <p className="sr-only">
          Background motion is off — reduced motion, data saver, or a slow
          connection is active.
        </p>
      ) : null}


      <div className="relative z-10">{children}</div>
    </div>
  );
}
