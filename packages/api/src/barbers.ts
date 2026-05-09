import type { BarberProfilePublic } from "@ozilcuts/types";

import { ApiError } from "./auth";
import { getApiBaseUrl } from "./base";

type BarbersListPayload = { data: BarberProfilePublic[] };

export async function fetchBarbers(): Promise<BarberProfilePublic[]> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/barbers`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load barbers", res.status, payload);
  }
  const body = (await res.json()) as BarbersListPayload;

  return body.data;
}

export async function fetchMyBarberProfile(token: string): Promise<BarberProfilePublic> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/barber/profile`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load barber profile", res.status, payload);
  }

  return res.json() as Promise<BarberProfilePublic>;
}

export async function fetchBarber(userId: number): Promise<BarberProfilePublic> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/barbers/${userId}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load barber profile", res.status, payload);
  }

  return res.json() as Promise<BarberProfilePublic>;
}
