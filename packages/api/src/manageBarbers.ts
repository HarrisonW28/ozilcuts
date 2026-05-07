import type {
  BarberManageRow,
  CreateBarberInput,
  LaravelValidationPayload,
  Paginated,
  UpdateBarberProfileInput,
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

export async function fetchManageBarbers(
  token: string,
  page = 1,
): Promise<Paginated<BarberManageRow>> {
  const url = new URL(`${getApiBaseUrl()}/api/v1/manage/barbers`);
  url.searchParams.set("page", String(page));
  const res = await fetch(url.toString(), {
    headers: authJsonHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load barbers", res.status, payload);
  }

  return res.json() as Promise<Paginated<BarberManageRow>>;
}

export async function createManagedBarber(
  token: string,
  body: CreateBarberInput,
): Promise<BarberManageRow> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/manage/barbers`, {
    method: "POST",
    headers: authJsonHeaders(token),
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => ({}))) as
    | BarberManageRow
    | LaravelValidationPayload;
  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError("Failed to create barber", res.status, payload);
  }

  return payload as BarberManageRow;
}

export async function updateManagedBarberProfile(
  token: string,
  userId: number,
  body: UpdateBarberProfileInput,
): Promise<BarberManageRow> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/manage/barbers/${userId}/profile`,
    {
      method: "PATCH",
      headers: authJsonHeaders(token),
      body: JSON.stringify(body),
    },
  );
  const payload = (await res.json().catch(() => ({}))) as
    | BarberManageRow
    | LaravelValidationPayload;
  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError("Failed to update profile", res.status, payload);
  }

  return payload as BarberManageRow;
}
