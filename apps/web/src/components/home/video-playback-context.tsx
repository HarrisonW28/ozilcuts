"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const SESSION_KEY = "ozilcuts-home-video-user-paused";

type HomeVideoPlaybackContextValue = {
  userPaused: boolean;
  toggleUserPause: () => void;
};

const HomeVideoPlaybackContext =
  createContext<HomeVideoPlaybackContextValue | null>(null);

export function HomeVideoPlaybackProvider({ children }: { children: ReactNode }) {
  const [userPaused, setUserPaused] = useState(false);

  useEffect(() => {
    try {
      if (
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(SESSION_KEY) === "1"
      ) {
        setUserPaused(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleUserPause = useCallback(() => {
    setUserPaused((p) => {
      const next = !p;
      try {
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem(SESSION_KEY, next ? "1" : "0");
        }
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ userPaused, toggleUserPause }),
    [userPaused, toggleUserPause],
  );

  return (
    <HomeVideoPlaybackContext.Provider value={value}>
      {children}
    </HomeVideoPlaybackContext.Provider>
  );
}

export function useHomeVideoPlayback(): HomeVideoPlaybackContextValue {
  const ctx = useContext(HomeVideoPlaybackContext);
  if (!ctx) {
    throw new Error("useHomeVideoPlayback requires HomeVideoPlaybackProvider");
  }
  return ctx;
}

export function useOptionalHomeVideoPlayback(): HomeVideoPlaybackContextValue | null {
  return useContext(HomeVideoPlaybackContext);
}
