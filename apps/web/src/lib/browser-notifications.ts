/** Browser Notification API helpers (distinct from in-app notification preferences). */

export type BrowserNotificationPermission =
  | "default"
  | "granted"
  | "denied"
  | "unsupported";

export function browserNotificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function currentBrowserNotificationPermission(): BrowserNotificationPermission {
  if (!browserNotificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (!browserNotificationsSupported()) return "unsupported";
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return "denied";
  }
}
