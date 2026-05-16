"use client";

import { HomeVideoStaticFallback } from "@/components/home/static-fallback";
import { useHomeVideoAutoplay } from "@/hooks/use-home-video-autoplay";
import {
  getHomeVideoSources,
  type HomeVideoSources,
} from "@/lib/home-video-config";
import { cn } from "@ozilcuts/ui";
import { useMemo } from "react";

type HomeVideoAutoplayState = ReturnType<typeof useHomeVideoAutoplay>;

type HomeBackgroundVideoProps = {
  variant: "hero" | "ambient";
  className?: string;
  enabled?: boolean;
  /** Share one observer/play session with a parent (e.g. cinematic hero shell). */
  autoplay?: HomeVideoAutoplayState;
  sources?: HomeVideoSources;
};

/**
 * Deferred muted loop with static fallback, loading shimmer, and error recovery
 * via gradient (no retry loop).
 */
export function HomeBackgroundVideo({
  variant,
  className,
  enabled = true,
  autoplay,
  sources: sourcesProp,
}: HomeBackgroundVideoProps) {
  const sources = useMemo(
    () => sourcesProp ?? getHomeVideoSources(),
    [sourcesProp],
  );
  const mp4 = variant === "hero" ? sources.heroMp4 : sources.ambientMp4;
  const webm = variant === "hero" ? sources.heroWebm : sources.ambientWebm;
  const poster = variant === "hero" ? sources.heroPoster : undefined;

  const internal = useHomeVideoAutoplay({ enabled: enabled && !autoplay });
  const {
    containerRef,
    videoRef,
    shouldLoadSources,
    showStaticFallback,
    isBuffering,
    onVideoError,
    onCanPlay,
    onWaiting,
  } = autoplay ?? internal;

  const videoClass =
    variant === "hero" ? "home-video-hero" : "home-video-ambient";

  const layerClass =
    variant === "hero"
      ? autoplay
        ? "pointer-events-none absolute inset-0 -z-30 overflow-hidden rounded-[inherit]"
        : "home-video-layer -z-30 rounded-[inherit]"
      : "relative h-full w-full";

  return (
    <div
      ref={autoplay ? undefined : containerRef}
      className={cn(layerClass, className)}
      aria-hidden
    >
      {showStaticFallback ? (
        <HomeVideoStaticFallback variant={variant} poster={poster} />
      ) : null}

      {shouldLoadSources && !showStaticFallback ? (
        <video
          ref={videoRef}
          className={videoClass}
          muted
          loop
          playsInline
          preload={variant === "hero" ? "metadata" : "none"}
          poster={poster}
          disablePictureInPicture
          disableRemotePlayback
          onError={onVideoError}
          onCanPlay={onCanPlay}
          onWaiting={onWaiting}
        >
          {webm ? <source src={webm} type="video/webm" /> : null}
          {mp4 ? <source src={mp4} type="video/mp4" /> : null}
        </video>
      ) : null}

      {isBuffering ? <div className="home-video-loading" aria-hidden /> : null}
    </div>
  );
}
