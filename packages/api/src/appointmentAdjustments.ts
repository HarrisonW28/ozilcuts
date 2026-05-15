import type {
  AppointmentAdjustmentRequestPayload,
  AppointmentAdjustmentSuggestionsPayload,
  AppointmentRecord,
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

export async function fetchAppointmentAdjustmentSuggestions(
  token: string,
  appointmentId: number,
): Promise<AppointmentAdjustmentSuggestionsPayload> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/adjustment-suggestions`,
    { headers: authHeaders(token), cache: "no-store" },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(
      "Failed to load move suggestions",
      res.status,
      payload,
    );
  }

  return res.json() as Promise<AppointmentAdjustmentSuggestionsPayload>;
}

export async function fetchAppointmentAdjustmentRequest(
  token: string,
  appointmentId: number,
): Promise<AppointmentAdjustmentRequestPayload> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/adjustment-request`,
    { headers: authHeaders(token), cache: "no-store" },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(
      "Failed to load move request",
      res.status,
      payload,
    );
  }

  return res.json() as Promise<AppointmentAdjustmentRequestPayload>;
}

export async function createAppointmentAdjustmentRequest(
  token: string,
  appointmentId: number,
  startsAt: string,
): Promise<AppointmentAdjustmentRequestPayload> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/adjustment-request`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ starts_at: startsAt }),
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
    throw new ApiError("Failed to request move", res.status, payload);
  }

  return payload as AppointmentAdjustmentRequestPayload;
}

export async function approveAppointmentAdjustmentRequest(
  token: string,
  appointmentId: number,
): Promise<{ appointment: AppointmentRecord; request: null }> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/adjustment-request/approve`,
    { method: "PATCH", headers: authHeaders(token) },
  );
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError("Failed to approve move", res.status, payload);
  }

  return payload as { appointment: AppointmentRecord; request: null };
}

export async function rejectAppointmentAdjustmentRequest(
  token: string,
  appointmentId: number,
): Promise<AppointmentAdjustmentRequestPayload> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/adjustment-request/reject`,
    { method: "PATCH", headers: authHeaders(token) },
  );
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError("Failed to reject move", res.status, payload);
  }

  return payload as AppointmentAdjustmentRequestPayload;
}

export async function withdrawAppointmentAdjustmentRequest(
  token: string,
  appointmentId: number,
): Promise<AppointmentAdjustmentRequestPayload> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/adjustment-request/withdraw`,
    { method: "PATCH", headers: authHeaders(token) },
  );
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError("Failed to withdraw move request", res.status, payload);
  }

  return payload as AppointmentAdjustmentRequestPayload;
}
