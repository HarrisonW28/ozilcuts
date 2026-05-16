import {
  clearStoredAuthToken,
  getStoredAuthToken,
  isUnauthorizedStatus,
  subscribeStoredAuthTokenChanges,
} from "@/lib/auth-token";
import { ApiError, fetchCurrentUser } from "@ozilcuts/api";
import type { AuthUser } from "@ozilcuts/types";

export type ProfileState =
  | { kind: "none" }
  | { kind: "loading" }
  | { kind: "ready"; user: AuthUser }
  | { kind: "error" };

const SESSION_CACHE_KEY = "ozilcuts_session_profile_v1";
const CACHE_TTL_MS = 3 * 60 * 1000;

const listeners = new Set<() => void>();
let fetchGeneration = 0;
let fetchFailed = false;

function notify(): void {
  listeners.forEach((listener) => listener());
}

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

export function writeSessionProfileCache(token: string, user: AuthUser): void {
  try {
    sessionStorage.setItem(
      SESSION_CACHE_KEY,
      JSON.stringify({ token, user, at: Date.now() }),
    );
  } catch {
    /* storage full */
  }
}

export function clearSessionProfileCache(): void {
  try {
    sessionStorage.removeItem(SESSION_CACHE_KEY);
  } catch {
    /* noop */
  }
}

/** Synchronous read from token + session cache (client only). */
export function readProfileFromClientStorage(): ProfileState {
  if (typeof window === "undefined") return { kind: "none" };

  const token = getStoredAuthToken();
  if (!token) {
    return { kind: "none" };
  }

  const cached = readSessionCache(token);
  if (cached) {
    return { kind: "ready", user: cached };
  }

  if (fetchFailed) {
    return { kind: "error" };
  }

  return { kind: "loading" };
}

export function hasStoredAuthSession(): boolean {
  return getStoredAuthToken() !== null;
}

export function subscribeProfileStore(listener: () => void): () => void {
  const unsubToken = subscribeStoredAuthTokenChanges(() => {
    fetchFailed = false;
    void syncProfileFromNetwork();
  });
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    unsubToken();
  };
}

export function getProfileServerSnapshot(): ProfileState {
  return { kind: "none" };
}

export function getProfileClientSnapshot(): ProfileState {
  return readProfileFromClientStorage();
}

export async function syncProfileFromNetwork(): Promise<void> {
  const token = getStoredAuthToken();
  if (!token) {
    fetchGeneration += 1;
    fetchFailed = false;
    clearSessionProfileCache();
    notify();
    return;
  }

  fetchGeneration += 1;
  const generation = fetchGeneration;
  fetchFailed = false;
  notify();

  try {
    const user = await fetchCurrentUser(token);
    if (generation !== fetchGeneration) return;
    writeSessionProfileCache(token, user);
    fetchFailed = false;
    notify();
  } catch (err: unknown) {
    if (generation !== fetchGeneration) return;
    if (err instanceof ApiError && isUnauthorizedStatus(err.status)) {
      clearStoredAuthToken();
      clearSessionProfileCache();
      fetchFailed = false;
      notify();
      return;
    }
    const cached = readSessionCache(token);
    if (cached) {
      fetchFailed = false;
      notify();
      return;
    }
    fetchFailed = true;
    notify();
  }
}
