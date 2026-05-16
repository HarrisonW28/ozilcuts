import type {
  AppointmentThreadMessage,
  AppointmentThreadPayload,
  LaravelValidationPayload,
} from "@ozilcuts/types";

import { ApiError, ApiValidationError } from "./auth";
import { getApiBaseUrl } from "./base";

function authHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/** Weak-signal resilience: bounded wait before surfacing a friendly timeout. */
const APPOINTMENT_THREAD_FETCH_MS = 26_000;

async function appointmentThreadFetch(
  input: string,
  init: RequestInit,
): Promise<Response> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), APPOINTMENT_THREAD_FETCH_MS);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new ApiError(
        "Could not reach the server in time — check your connection and try again.",
        0,
        { reason: "timeout" },
      );
    }
    throw e;
  } finally {
    clearTimeout(tid);
  }
}

export async function fetchAppointmentThread(
  token: string,
  appointmentId: number,
  options?: { after?: number },
): Promise<AppointmentThreadPayload> {
  const url = new URL(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/messages`,
  );
  if (options?.after !== undefined && options.after > 0) {
    url.searchParams.set("after", String(options.after));
  }

  const res = await appointmentThreadFetch(url.toString(), {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError(
      "Failed to load visit messages",
      res.status,
      payload,
    );
  }

  return res.json() as Promise<AppointmentThreadPayload>;
}

export async function postAppointmentThreadMessage(
  token: string,
  appointmentId: number,
  body: {
    kind: "note" | "operational" | "preset";
    body?: string;
    operational_key?: string;
    preset_key?: string;
  },
): Promise<{ message: AppointmentThreadMessage }> {
  const res = await appointmentThreadFetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/messages`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(body),
    },
  );
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError(
      "Failed to send visit message",
      res.status,
      payload,
    );
  }

  return payload as { message: AppointmentThreadMessage };
}

export async function markAppointmentThreadRead(
  token: string,
  appointmentId: number,
  lastReadMessageId: number,
): Promise<{ ok: boolean }> {
  const res = await appointmentThreadFetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/messages/read`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ last_read_message_id: lastReadMessageId }),
    },
  );
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError(
      "Failed to update read state",
      res.status,
      payload,
    );
  }

  return payload as { ok: boolean };
}
