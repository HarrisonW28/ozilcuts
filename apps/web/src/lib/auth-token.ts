const STORAGE_KEY = "ozilcuts_auth_token";

export function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setStoredAuthToken(token: string): void {
  window.localStorage.setItem(STORAGE_KEY, token);
}

export function clearStoredAuthToken(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
