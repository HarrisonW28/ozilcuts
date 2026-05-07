import type {
  AppointmentHairProfileResponse,
  HairProfile,
  HairProfilePhoto,
  LaravelValidationPayload,
  UpdateHairProfileInput,
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

export async function fetchHairProfile(token: string): Promise<HairProfile> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/customer/hair-profile`, {
    headers: authJsonHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load hair profile", res.status, payload);
  }

  return res.json() as Promise<HairProfile>;
}

export async function updateHairProfile(
  token: string,
  body: UpdateHairProfileInput,
): Promise<HairProfile> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/customer/hair-profile`, {
    method: "PATCH",
    headers: authJsonHeaders(token),
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => ({}))) as
    | HairProfile
    | LaravelValidationPayload;

  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError("Failed to update hair profile", res.status, payload);
  }

  return payload as HairProfile;
}

export async function uploadHairProfilePhoto(
  token: string,
  file: File,
  caption?: string,
): Promise<HairProfilePhoto> {
  const form = new FormData();
  form.append("photo", file);
  if (caption !== undefined && caption !== "") {
    form.append("caption", caption);
  }

  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/customer/hair-profile/photos`,
    {
      method: "POST",
      headers: authMultipartHeaders(token),
      body: form,
    },
  );
  const payload = (await res.json().catch(() => ({}))) as
    | HairProfilePhoto
    | LaravelValidationPayload;

  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError("Failed to upload photo", res.status, payload);
  }

  return payload as HairProfilePhoto;
}

export async function deleteHairProfilePhoto(
  token: string,
  photoId: number,
): Promise<void> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/customer/hair-profile/photos/${photoId}`,
    {
      method: "DELETE",
      headers: authJsonHeaders(token),
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to delete photo", res.status, payload);
  }
}

export async function fetchAppointmentHairProfile(
  token: string,
  appointmentId: number,
): Promise<AppointmentHairProfileResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/hair-profile`,
    {
      headers: authJsonHeaders(token),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load hair profile", res.status, payload);
  }

  return res.json() as Promise<AppointmentHairProfileResponse>;
}
