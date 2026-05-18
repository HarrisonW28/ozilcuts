"use client";

import { HomeVideoStaticFallback } from "@/components/home/static-fallback";
import { useHomeVideoAutoplay } from "@/hooks/use-home-video-autoplay";
import {
  hasHeroVideo,
  heroBundleHasVideo,
  resolveAmbientBundle,
  resolveHomeVideoSources,
  type HeroMediaBundle,
  type HomeVideoSources,
} from "@/lib/home-video-config";
import { cn } from "@ozilcuts/ui";
import { useEffect, useMemo, useRef, type RefObject } from "react";

type HomeVideoAutoplayState = ReturnType<typeof useHomeVideoAutoplay>;

type HomeBackgroundVideoProps = {
  variant: "hero" | "ambient";
  className?: string;
  enabled?: boolean;
  autoplay?: HomeVideoAutoplayState;
  sources?: HomeVideoSources;
};

function pickMobileBundle(sources: HomeVideoSources): HeroMediaBundle | null {
  if (heroBundleHasVideo(sources.mobile)) {
    return sources.mobile;
  }
  if (heroBundleHasVideo(sources.desktop)) {
    return sources.desktop;
  }
  return null;
}

function pickDesktopBundle(sources: HomeVideoSources): HeroMediaBundle | null {
  if (heroBundleHasVideo(sources.desktop)) {
    return sources.desktop;
  }
  return null;
}

type SlotVideoProps = {
  bundle: HeroMediaBundle;
  videoClass: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  shouldLoadSources: boolean;
  showStaticFallback: boolean;
  isBuffering: boolean;
  onVideoError: () => void;
  onCanPlay: () => void;
  onWaiting: () => void;
  visibilityClass: string;
  preload: "metadata" | "none";
};

function SlotVideo({
  bundle,
  videoClass,
  videoRef,
  shouldLoadSources,
  showStaticFallback,
  isBuffering,
  onVideoError,
  onCanPlay,
  onWaiting,
  visibilityClass,
  preload,
}: SlotVideoProps) {
  return (
    <div
      className={cn("home-hero-video-slot", visibilityClass)}
      aria-hidden
    >
      {showStaticFallback ? (
        <HomeVideoStaticFallback
          variant="hero"
          poster={bundle.poster ?? undefined}
        />
      ) : null}
      {shouldLoadSources && !showStaticFallback ? (
        <video
          ref={videoRef}
          className={videoClass}
          muted
          loop
          playsInline
          preload={preload}
          disablePictureInPicture
          disableRemotePlayback
          onError={onVideoError}
          onCanPlay={onCanPlay}
          onWaiting={onWaiting}
        >
          {bundle.webm ? <source src={bundle.webm} type="video/webm" /> : null}
          {bundle.mp4 ? <source src={bundle.mp4} type="video/mp4" /> : null}
        </video>
      ) : null}
      {isBuffering ? <div className="home-video-loading" aria-hidden /> : null}
    </div>
  );
}

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
    () => sourcesProp ?? resolveHomeVideoSources(null),
    [sourcesProp],
  );

  const internal = useHomeVideoAutoplay({ enabled: enabled && !autoplay });
  const state = autoplay ?? internal;

  const desktopRef = useRef<HTMLVideoElement>(null);
  const mobileRef = useRef<HTMLVideoElement>(null);

  const videoClass =
    variant === "hero"
      ? "home-video-hero home-video-hero--cover"
      : "home-video-ambient";

  const layerClass =
    variant === "hero"
      ? autoplay
        ? "home-cinematic-hero-media"
        : "home-video-layer -z-30"
      : "relative h-full w-full";

  const ambientBundle = resolveAmbientBundle(sources);
  const desktopBundle = pickDesktopBundle(sources);
  const mobileBundle = pickMobileBundle(sources);
  useEffect(() => {
    if (variant !== "hero" || !state.shouldLoadSources || state.showStaticFallback) {
      return;
    }

    const syncPlayback = () => {
      if (document.visibilityState !== "visible") {
        desktopRef.current?.pause();
        mobileRef.current?.pause();
        return;
      }

      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      const useMobile =
        isMobile && mobileBundle && heroBundleHasVideo(mobileBundle);
      const active = useMobile ? mobileRef.current : desktopRef.current;
      const inactive = useMobile ? desktopRef.current : mobileRef.current;

      inactive?.pause();
      void active?.play().catch(() => {
        /* autoplay policy */
      });
    };

    syncPlayback();
    const mq = window.matchMedia("(max-width: 767px)");
    mq.addEventListener("change", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      mq.removeEventListener("change", syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  }, [
    variant,
    state.shouldLoadSources,
    state.showStaticFallback,
    desktopBundle,
    mobileBundle,
  ]);

  if (variant === "ambient") {
    if (!ambientBundle || !heroBundleHasVideo(ambientBundle)) {
      return (
        <div className={cn(layerClass, className)} aria-hidden>
          <HomeVideoStaticFallback variant="ambient" />
        </div>
      );
    }

    return (
      <div
        ref={autoplay ? undefined : state.containerRef}
        className={cn(layerClass, className)}
        aria-hidden
      >
        {state.showStaticFallback ? (
          <HomeVideoStaticFallback variant="ambient" />
        ) : null}
        {state.shouldLoadSources && !state.showStaticFallback ? (
          <video
            ref={state.videoRef}
            className={videoClass}
            muted
            loop
            playsInline
            preload="none"
            disablePictureInPicture
            disableRemotePlayback
            onError={state.onVideoError}
            onCanPlay={state.onCanPlay}
            onWaiting={state.onWaiting}
          >
            {ambientBundle.webm ? (
              <source src={ambientBundle.webm} type="video/webm" />
            ) : null}
            {ambientBundle.mp4 ? (
              <source src={ambientBundle.mp4} type="video/mp4" />
            ) : null}
          </video>
        ) : null}
        {state.isBuffering ? (
          <div className="home-video-loading" aria-hidden />
        ) : null}
      </div>
    );
  }

  if (!hasHeroVideo(sources)) {
    return null;
  }

  const desktopVisibility = mobileBundle
    ? "hidden md:block"
    : "block";
  const mobileVisibility = desktopBundle ? "block md:hidden" : "block";

  return (
    <div
      ref={autoplay ? undefined : state.containerRef}
      className={cn(layerClass, className)}
      aria-hidden
    >
      {desktopBundle ? (
        <SlotVideo
          bundle={desktopBundle}
          videoClass={videoClass}
          videoRef={desktopRef}
          shouldLoadSources={state.shouldLoadSources}
          showStaticFallback={state.showStaticFallback}
          isBuffering={state.isBuffering}
          onVideoError={state.onVideoError}
          onCanPlay={state.onCanPlay}
          onWaiting={state.onWaiting}
          visibilityClass={desktopVisibility}
          preload="metadata"
        />
      ) : null}
      {mobileBundle ? (
        <SlotVideo
          bundle={mobileBundle}
          videoClass={videoClass}
          videoRef={mobileRef}
          shouldLoadSources={state.shouldLoadSources}
          showStaticFallback={state.showStaticFallback}
          isBuffering={state.isBuffering}
          onVideoError={state.onVideoError}
          onCanPlay={state.onCanPlay}
          onWaiting={state.onWaiting}
          visibilityClass={mobileVisibility}
          preload="metadata"
        />
      ) : null}
    </div>
  );
}
