"use client";

import { HomeBackgroundVideo } from "@/components/home/background-video";
import { useHomeVideoPlayback } from "@/components/home/video-playback-context";
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
 * Full-bleed hero shell: deferred muted loop video, editorial gradients, and an
 * optional user pause control (session-scoped).
 */
export function HomeCinematicHero({
  children,
  className,
  videoSources,
}: HomeCinematicHeroProps) {
  const autoplay = useHomeVideoAutoplay({ enabled: true });
  const { allowMotion, userPaused } = autoplay;
  const { toggleUserPause } = useHomeVideoPlayback();

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

      {allowMotion ? (
        <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4">
          <button
            type="button"
            onClick={toggleUserPause}
            aria-pressed={userPaused}
            className={cn(
              "pointer-events-auto rounded-full border border-white/35 bg-black/45 px-3 py-1.5 text-micro font-semibold uppercase tracking-widecaps text-white shadow-sm backdrop-blur-md",
              "transition-[background-color,box-shadow] motion-safe:duration-[var(--motion-duration-fast)] motion-safe:ease-[var(--motion-ease-standard)]",
              "hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
            )}
          >
            {userPaused ? "Play motion" : "Pause motion"}
          </button>
        </div>
      ) : null}

      <div className="relative z-10">{children}</div>
    </div>
  );
}
