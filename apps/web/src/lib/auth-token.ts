/** localStorage key for the Sanctum bearer token (not HttpOnly — see session provider). */
const STORAGE_KEY = "ozilcuts_auth_token";

const CHANGE_EVENT = "ozilcuts-auth-token-changed";

/** True when an API response indicates the stored token is no longer valid. */
export function isUnauthorizedStatus(status: number): boolean {
  return status === 401;
}

export function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setStoredAuthToken(token: string): void {
  window.localStorage.setItem(STORAGE_KEY, token);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearStoredAuthToken(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Same-tab login/logout + cross-tab storage sync (another window signs out). */
export function subscribeStoredAuthTokenChanges(
  handler: () => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const onCustom = () => handler();
  const onStorage = (e: StorageEvent) => {
    if (e.storageArea !== window.localStorage) return;
    if (e.key !== null && e.key !== STORAGE_KEY) return;
    handler();
  };

  window.addEventListener(CHANGE_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
