"use client";

import {
  clearStoredAuthToken,
  getStoredAuthToken,
  subscribeStoredAuthTokenChanges,
} from "@/lib/auth-token";
import { fetchCurrentUser, logoutUser } from "@ozilcuts/api";
import type { AuthUser } from "@ozilcuts/types";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ProfileState =
  | { kind: "none" }
  | { kind: "loading" }
  | { kind: "ready"; user: AuthUser }
  | { kind: "error" };

const SESSION_CACHE_KEY = "ozilcuts_session_profile_v1";
const CACHE_TTL_MS = 3 * 60 * 1000;

type SessionProfileContextValue = {
  profile: ProfileState;
  signOut: () => Promise<void>;
  replaceProfile: (user: AuthUser) => void;
  refreshProfile: () => Promise<void>;
};

const SessionProfileContext = createContext<SessionProfileContextValue | null>(
  null,
);

function readSessionCache(token: string): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      token: string;
      user: AuthUser;
      at: number;
    };
    if (parsed.token !== token) return null;
    if (Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return parsed.user;
  } catch {
    return null;
  }
}

function writeSessionCache(token: string, user: AuthUser): void {
  try {
    sessionStorage.setItem(
      SESSION_CACHE_KEY,
      JSON.stringify({ token, user, at: Date.now() }),
    );
  } catch {
    /* storage full */
  }
}

function clearSessionProfileCache(): void {
  try {
    sessionStorage.removeItem(SESSION_CACHE_KEY);
  } catch {
    /* noop */
  }
}

export function SessionProfileProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileState>({ kind: "none" });

  useLayoutEffect(() => {
    let fetchGen = 0;

    const sync = () => {
      const token = getStoredAuthToken();
      if (!token) {
        fetchGen += 1;
        clearSessionProfileCache();
        setProfile({ kind: "none" });
        return;
      }

      const cached = readSessionCache(token);
      if (cached) {
        setProfile({ kind: "ready", user: cached });
      } else {
        setProfile({ kind: "loading" });
      }

      fetchGen += 1;
      const myGen = fetchGen;
      fetchCurrentUser(token)
        .then((user) => {
          if (myGen !== fetchGen) return;
          writeSessionCache(token, user);
          setProfile({ kind: "ready", user });
        })
        .catch(() => {
          if (myGen !== fetchGen) return;
          setProfile((prev) =>
            prev.kind === "ready" ? prev : { kind: "error" },
          );
        });
    };

    sync();
    return subscribeStoredAuthTokenChanges(sync);
  }, []);

  const signOut = useCallback(async () => {
    const token = getStoredAuthToken();
    if (token) {
      try {
        await logoutUser(token);
      } catch {
        /* still clear local session */
      }
    }
    clearStoredAuthToken();
    router.refresh();
  }, [router]);

  const replaceProfile = useCallback((user: AuthUser) => {
    const token = getStoredAuthToken();
    if (token) writeSessionCache(token, user);
    setProfile({ kind: "ready", user });
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      clearSessionProfileCache();
      setProfile({ kind: "none" });
      return;
    }
    try {
      const user = await fetchCurrentUser(token);
      writeSessionCache(token, user);
      setProfile({ kind: "ready", user });
    } catch {
      if (!getStoredAuthToken()) {
        setProfile({ kind: "none" });
      } else {
        setProfile((p) => (p.kind === "ready" ? p : { kind: "error" }));
      }
    }
  }, []);

  const value = useMemo(
    () => ({ profile, signOut, replaceProfile, refreshProfile }),
    [profile, signOut, replaceProfile, refreshProfile],
  );

  return (
    <SessionProfileContext.Provider value={value}>
      {children}
    </SessionProfileContext.Provider>
  );
}

export function useSessionProfile(): SessionProfileContextValue {
  const ctx = useContext(SessionProfileContext);
  if (!ctx) {
    throw new Error(
      "useSessionProfile must be used within SessionProfileProvider",
    );
  }
  return ctx;
}
