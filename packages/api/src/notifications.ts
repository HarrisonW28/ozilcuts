import type {
  LaravelValidationPayload,
  NotificationMarkAllReadResponse,
  NotificationPreferenceRow,
  NotificationPreferencesResponse,
  NotificationRecord,
  NotificationUnreadCountResponse,
  Paginated,
} from "@ozilcuts/types";

import { ApiError, ApiValidationError } from "./auth";
import { getApiBaseUrl } from "./base";

function authHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function jsonAuthHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchNotifications(
  token: string,
  options: { unread?: boolean; page?: number } = {},
): Promise<Paginated<NotificationRecord>> {
  const url = new URL(`${getApiBaseUrl()}/api/v1/notifications`);
  if (options.unread) url.searchParams.set("unread", "1");
  if (options.page) url.searchParams.set("page", String(options.page));

  const res = await fetch(url.toString(), {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load notifications", res.status, payload);
  }

  return res.json() as Promise<Paginated<NotificationRecord>>;
}

export async function fetchNotificationUnreadCount(
  token: string,
): Promise<NotificationUnreadCountResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/notifications/unread-count`,
    {
      headers: authHeaders(token),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(
      "Failed to load notification counts",
      res.status,
      payload,
    );
  }

  return res.json() as Promise<NotificationUnreadCountResponse>;
}

export async function markNotificationRead(
  token: string,
  notificationId: number,
): Promise<NotificationRecord> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/notifications/${notificationId}/read`,
    {
      method: "PATCH",
      headers: authHeaders(token),
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(
      "Failed to mark notification read",
      res.status,
      payload,
    );
  }

  return res.json() as Promise<NotificationRecord>;
}

export async function markAllNotificationsRead(
  token: string,
): Promise<NotificationMarkAllReadResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/notifications/read-all`,
    {
      method: "PATCH",
      headers: authHeaders(token),
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(
      "Failed to mark notifications read",
      res.status,
      payload,
    );
  }

  return res.json() as Promise<NotificationMarkAllReadResponse>;
}

export async function fetchNotificationPreferences(
  token: string,
): Promise<NotificationPreferencesResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/notification-preferences`,
    {
      headers: authHeaders(token),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load preferences", res.status, payload);
  }

  return res.json() as Promise<NotificationPreferencesResponse>;
}

export async function updateNotificationPreferences(
  token: string,
  preferences: NotificationPreferenceRow[],
): Promise<{ preferences: NotificationPreferenceRow[] }> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/notification-preferences`,
    {
      method: "PUT",
      headers: jsonAuthHeaders(token),
      body: JSON.stringify({ preferences }),
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError("Failed to update preferences", res.status, payload);
  }

  return res.json() as Promise<{ preferences: NotificationPreferenceRow[] }>;
}
