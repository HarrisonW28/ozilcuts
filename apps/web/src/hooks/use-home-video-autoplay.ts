"use client";

import {
  readNavigatorSaveData,
  readSlowConnection,
} from "@/lib/home-video-prefs";
import { useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type UseHomeVideoAutoplayOptions = {
  /** When false, no sources load and play effect is a no-op. */
  enabled: boolean;
};

/**
 * Defers loading until the container is on screen, respects reduced motion,
 * Save-Data, slow connections, and tab visibility.
 */
export function useHomeVideoAutoplay({
  enabled,
}: UseHomeVideoAutoplayOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();

  const [saveData, setSaveData] = useState(false);
  const [slowConnection, setSlowConnection] = useState(false);
  const [inView, setInView] = useState(false);
  const [hasLoadedSources, setHasLoadedSources] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setSaveData(readNavigatorSaveData());
    setSlowConnection(readSlowConnection());
  }, []);

  useEffect(() => {
    const onVis = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    onVis();
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const allowMotion = useMemo(
    () =>
      enabled &&
      reduceMotion !== true &&
      !saveData &&
      !slowConnection &&
      !loadError,
    [enabled, reduceMotion, saveData, slowConnection, loadError],
  );

  useEffect(() => {
    if (!allowMotion || !containerRef.current) return;
    const node = containerRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.some(
          (e) => e.isIntersecting && e.intersectionRatio > 0.12,
        );
        setInView(hit);
      },
      { threshold: [0, 0.12, 0.35], rootMargin: "48px 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [allowMotion]);

  useEffect(() => {
    if (inView && allowMotion) {
      setHasLoadedSources(true);
    }
  }, [inView, allowMotion]);

  const shouldMountVideo = allowMotion && hasLoadedSources;

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !shouldMountVideo) return;
    if (!inView || !tabVisible) {
      v.pause();
      return;
    }
    void v.play().catch(() => {
      /* autoplay policy */
    });
  }, [shouldMountVideo, inView, tabVisible]);

  const onVideoError = useCallback(() => {
    setLoadError(true);
    setIsReady(false);
  }, []);

  const onCanPlay = useCallback(() => {
    setIsReady(true);
  }, []);

  const onWaiting = useCallback(() => {
    setIsReady(false);
  }, []);

  return {
    containerRef,
    videoRef,
    shouldLoadSources: shouldMountVideo,
    allowMotion,
    reduceMotion: reduceMotion === true,
    saveData,
    slowConnection,
    loadError,
    isBuffering: shouldMountVideo && !isReady && !loadError,
    showStaticFallback: !allowMotion || loadError,
    onVideoError,
    onCanPlay,
    onWaiting,
  };
}
