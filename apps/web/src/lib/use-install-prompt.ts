"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Browser-fired event used by Chromium-based browsers (Android Chrome,
 * Edge, etc.) to defer the install prompt so the app can decide when
 * to surface it. Not part of the standard `WindowEventMap`, hence the
 * minimal local typing.
 */
type BeforeInstallPromptEvent = Event & {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt: () => Promise<void>;
};

const DISMISS_STORAGE_KEY = "ozilcuts.pwa.install-dismissed-at";
const VISIT_COUNT_KEY = "ozilcuts.pwa.visits";
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
const IOS_MIN_VISITS_BEFORE_PROMPT = 2;

export type InstallSource = "android" | "ios";

export type UseInstallPromptResult = {
  /** Whether the prompt card should be visible in the UI right now. */
  isVisible: boolean;
  /**
   * The kind of install affordance available. `android` triggers the
   * native deferred prompt, `ios` shows manual Add-to-Home-Screen
   * instructions.
   */
  source: InstallSource | null;
  /** Whether the app is currently running in standalone (installed) mode. */
  isStandalone: boolean;
  /** Trigger the deferred Android/Chrome install prompt. */
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  /** Mark the prompt as dismissed for the cooldown window. */
  dismiss: () => void;
};

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  const navStandalone = (window.navigator as Navigator & { standalone?: boolean })
    .standalone;
  return navStandalone === true;
}

function detectIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
  if (!isIos) return false;
  // Other iOS browsers (Chrome, Firefox, Edge) inject their own UA tokens
  // and cannot install PWAs anyway, so only target Safari.
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isSafari;
}

function readDismissedAt(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isWithinDismissCooldown(): boolean {
  const ts = readDismissedAt();
  if (!ts) return false;
  return Date.now() - ts < DISMISS_COOLDOWN_MS;
}

function bumpVisitCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(VISIT_COUNT_KEY);
    const previous = raw ? Number.parseInt(raw, 10) : 0;
    const next = (Number.isFinite(previous) ? previous : 0) + 1;
    window.localStorage.setItem(VISIT_COUNT_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

/**
 * Coordinates the install affordance for both Android (deferred
 * `beforeinstallprompt`) and iOS Safari (manual instructions).
 *
 * Behaviour:
 * - Hides while the app is already running standalone.
 * - On Android: surfaces only when the browser fires the deferred
 *   prompt event (Chrome's heuristics already require engagement, so
 *   we don't gate further).
 * - On iOS Safari: surfaces from the second visit onward to avoid
 *   spamming first-time visitors.
 * - Honours a 14-day dismissal cooldown across both surfaces.
 */
export function useInstallPrompt(): UseInstallPromptResult {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [iosEligible, setIosEligible] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setIsStandalone(detectStandalone());
    setDismissed(isWithinDismissCooldown());

    if (detectIosSafari()) {
      const visits = bumpVisitCount();
      setIosEligible(visits >= IOS_MIN_VISITS_BEFORE_PROMPT);
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setIsStandalone(true);
    };
    const standaloneMql = window.matchMedia("(display-mode: standalone)");
    const onStandaloneChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    standaloneMql.addEventListener?.("change", onStandaloneChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      standaloneMql.removeEventListener?.("change", onStandaloneChange);
    };
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
    } catch {
      // Ignore storage errors (e.g. private mode); UI hides for the session anyway.
    }
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return "unavailable" as const;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      if (choice.outcome === "dismissed") dismiss();
      return choice.outcome;
    } catch {
      setDeferred(null);
      return "unavailable" as const;
    }
  }, [deferred, dismiss]);

  const source: InstallSource | null = deferred
    ? "android"
    : iosEligible && !isStandalone
      ? "ios"
      : null;

  const isVisible = !isStandalone && !dismissed && source !== null;

  return { isVisible, source, isStandalone, promptInstall, dismiss };
}
