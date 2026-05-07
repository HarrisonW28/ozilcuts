import type {
  BarberAvailabilityPayload,
  BarberAvailabilityWindowInput,
  LaravelValidationPayload,
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

export async function fetchBarberAvailability(
  userId: number,
): Promise<BarberAvailabilityPayload> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/barbers/${userId}/availability`,
    {
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load availability", res.status, payload);
  }

  return res.json() as Promise<BarberAvailabilityPayload>;
}

export async function fetchManageBarberAvailability(
  token: string,
  userId: number,
): Promise<BarberAvailabilityPayload> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/manage/barbers/${userId}/availability`,
    {
      headers: authJsonHeaders(token),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load availability", res.status, payload);
  }

  return res.json() as Promise<BarberAvailabilityPayload>;
}

export async function replaceManageBarberAvailability(
  token: string,
  userId: number,
  windows: BarberAvailabilityWindowInput[],
): Promise<BarberAvailabilityPayload> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/manage/barbers/${userId}/availability`,
    {
      method: "PUT",
      headers: authJsonHeaders(token),
      body: JSON.stringify({ windows }),
    },
  );
  const payload = (await res.json().catch(() => ({}))) as
    | BarberAvailabilityPayload
    | LaravelValidationPayload;
  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError("Failed to save availability", res.status, payload);
  }

  return payload as BarberAvailabilityPayload;
}
