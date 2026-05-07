import type {
  AppointmentRecord,
  BarberSlotsPayload,
  CreateAppointmentInput,
  LaravelValidationPayload,
  Paginated,
} from "@ozilcuts/types";

import { ApiError, ApiValidationError } from "./auth";
import { getApiBaseUrl } from "./base";

function authJsonHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchBarberSlots(
  userId: number,
  serviceId: number,
  /** YYYY-MM-DD */
  date: string,
): Promise<BarberSlotsPayload> {
  const url = new URL(`${getApiBaseUrl()}/api/v1/barbers/${userId}/slots`);
  url.searchParams.set("service_id", String(serviceId));
  url.searchParams.set("date", date);
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load slots", res.status, payload);
  }

  return res.json() as Promise<BarberSlotsPayload>;
}

export async function createAppointment(
  token: string,
  body: CreateAppointmentInput,
): Promise<AppointmentRecord> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/appointments`, {
    method: "POST",
    headers: authJsonHeaders(token),
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => ({}))) as
    | AppointmentRecord
    | LaravelValidationPayload;
  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError("Failed to book appointment", res.status, payload);
  }

  return payload as AppointmentRecord;
}

export async function fetchMyAppointments(
  token: string,
  page = 1,
): Promise<Paginated<AppointmentRecord>> {
  const url = new URL(`${getApiBaseUrl()}/api/v1/appointments`);
  url.searchParams.set("page", String(page));
  const res = await fetch(url.toString(), {
    headers: authJsonHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load appointments", res.status, payload);
  }

  return res.json() as Promise<Paginated<AppointmentRecord>>;
}
