import type {
  CustomerProfile,
  LaravelValidationPayload,
  UpdateCustomerProfileInput,
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

export async function fetchCustomerProfile(
  token: string,
): Promise<CustomerProfile> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/customer/profile`, {
    headers: authJsonHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load customer profile", res.status, payload);
  }

  return res.json() as Promise<CustomerProfile>;
}

export async function updateCustomerProfile(
  token: string,
  body: UpdateCustomerProfileInput,
): Promise<CustomerProfile> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/customer/profile`, {
    method: "PATCH",
    headers: authJsonHeaders(token),
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => ({}))) as
    | CustomerProfile
    | LaravelValidationPayload;

  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError("Failed to update customer profile", res.status, payload);
  }

  return payload as CustomerProfile;
}
