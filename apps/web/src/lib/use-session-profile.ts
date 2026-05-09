"use client";

import { clearStoredAuthToken, getStoredAuthToken } from "@/lib/auth-token";
import { fetchCurrentUser, logoutUser } from "@ozilcuts/api";
import type { AuthUser } from "@ozilcuts/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export type ProfileState =
  | { kind: "none" }
  | { kind: "loading" }
  | { kind: "ready"; user: AuthUser }
  | { kind: "error" };

export function useSessionProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileState>({ kind: "none" });

  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) {
      setProfile({ kind: "none" });
      return;
    }
    let cancelled = false;
    setProfile({ kind: "loading" });
    fetchCurrentUser(token)
      .then((user) => {
        if (!cancelled) setProfile({ kind: "ready", user });
      })
      .catch(() => {
        if (!cancelled) setProfile({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
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
    setProfile({ kind: "none" });
    router.refresh();
  }, [router]);

  const replaceProfile = useCallback((user: AuthUser) => {
    setProfile({ kind: "ready", user });
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      setProfile({ kind: "none" });
      return;
    }
    setProfile({ kind: "loading" });
    try {
      const user = await fetchCurrentUser(token);
      setProfile({ kind: "ready", user });
    } catch {
      if (!getStoredAuthToken()) {
        setProfile({ kind: "none" });
      } else {
        setProfile({ kind: "error" });
      }
    }
  }, []);

  return { profile, signOut, replaceProfile, refreshProfile };
}
