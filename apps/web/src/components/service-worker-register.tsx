"use client";

import { useEffect } from "react";

/**
 * Registers the offline-foundations service worker once on mount.
 *
 * Only runs in production builds and when the browser actually
 * supports service workers, so dev iteration is unaffected and we
 * never persist stale assets locally.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          // Failure here is non-fatal: the app keeps working online,
          // we just won't have offline fallback until next try.
        });
    };

    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad, { once: true });
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);

  return null;
}
