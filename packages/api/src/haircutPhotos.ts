import type {
  AppointmentHaircutPhotosResponse,
  BarberPortfolioResponse,
  HaircutPhoto,
  HaircutPhotoKind,
  LaravelValidationPayload,
  UpdateHaircutPhotoInput,
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

function authMultipartHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchAppointmentHaircutPhotos(
  token: string,
  appointmentId: number,
): Promise<AppointmentHaircutPhotosResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/haircut-photos`,
    {
      headers: authJsonHeaders(token),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load haircut photos", res.status, payload);
  }

  return res.json() as Promise<AppointmentHaircutPhotosResponse>;
}

export async function uploadHaircutPhoto(
  token: string,
  appointmentId: number,
  file: File,
  kind: HaircutPhotoKind,
  caption?: string,
): Promise<HaircutPhoto> {
  const form = new FormData();
  form.append("photo", file);
  form.append("kind", kind);
  if (caption !== undefined && caption !== "") {
    form.append("caption", caption);
  }

  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/haircut-photos`,
    {
      method: "POST",
      headers: authMultipartHeaders(token),
      body: form,
    },
  );
  const payload = (await res.json().catch(() => ({}))) as
    | HaircutPhoto
    | LaravelValidationPayload;

  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError("Failed to upload haircut photo", res.status, payload);
  }

  return payload as HaircutPhoto;
}

export async function updateHaircutPhoto(
  token: string,
  photoId: number,
  body: UpdateHaircutPhotoInput,
): Promise<HaircutPhoto> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/haircut-photos/${photoId}`,
    {
      method: "PATCH",
      headers: authJsonHeaders(token),
      body: JSON.stringify(body),
    },
  );
  const payload = (await res.json().catch(() => ({}))) as
    | HaircutPhoto
    | LaravelValidationPayload;

  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError("Failed to update haircut photo", res.status, payload);
  }

  return payload as HaircutPhoto;
}

export async function deleteHaircutPhoto(
  token: string,
  photoId: number,
): Promise<void> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/haircut-photos/${photoId}`,
    {
      method: "DELETE",
      headers: authJsonHeaders(token),
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to delete haircut photo", res.status, payload);
  }
}

export async function fetchBarberPortfolio(
  barberUserId: number,
  page = 1,
  perPage = 24,
): Promise<BarberPortfolioResponse> {
  const url = new URL(
    `${getApiBaseUrl()}/api/v1/barbers/${barberUserId}/portfolio`,
  );
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(perPage));
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load portfolio", res.status, payload);
  }

  return res.json() as Promise<BarberPortfolioResponse>;
}
