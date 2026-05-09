"use client";

import { useEffect, useState } from "react";

/**
 * Subscribes to `window.matchMedia`. Initial render is `false` until mounted.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener("change", onChange);

    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
