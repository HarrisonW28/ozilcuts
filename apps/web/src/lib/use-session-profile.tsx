"use client";

import {
  getProfileClientSnapshot,
  getProfileServerSnapshot,
  hasStoredAuthSession,
  subscribeProfileStore,
  syncProfileFromNetwork,
  writeSessionProfileCache,
  type ProfileState,
} from "@/lib/session-profile-store";
import { clearStoredAuthToken, getStoredAuthToken } from "@/lib/auth-token";
import { logoutUser } from "@ozilcuts/api";
import type { AuthUser } from "@ozilcuts/types";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type { ProfileState };
export { hasStoredAuthSession };

type SessionProfileContextValue = {
  profile: ProfileState;
  signOut: () => Promise<void>;
  replaceProfile: (user: AuthUser) => void;
  refreshProfile: () => Promise<void>;
};

const SessionProfileContext = createContext<SessionProfileContextValue | null>(
  null,
);

export function SessionProfileProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const profile = useSyncExternalStore(
    subscribeProfileStore,
    getProfileClientSnapshot,
    getProfileServerSnapshot,
  );

  useLayoutEffect(() => {
    void syncProfileFromNetwork();
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
    if (token) writeSessionProfileCache(token, user);
    void syncProfileFromNetwork();
  }, []);

  const refreshProfile = useCallback(async () => {
    await syncProfileFromNetwork();
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
