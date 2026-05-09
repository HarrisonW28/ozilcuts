import type {
  AuthUser,
  LaravelValidationPayload,
  PatchShopOnboardingInput,
  ServiceStarterPackResponse,
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

export async function patchShopOnboarding(
  token: string,
  body: PatchShopOnboardingInput,
): Promise<AuthUser> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/manage/shop-onboarding`, {
    method: "PATCH",
    headers: authJsonHeaders(token),
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => ({}))) as
    | AuthUser
    | LaravelValidationPayload;
  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError("Failed to save onboarding", res.status, payload);
  }

  return payload as AuthUser;
}

export async function applyServiceStarterPack(
  token: string,
): Promise<ServiceStarterPackResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/manage/services/starter-pack`,
    {
      method: "POST",
      headers: authJsonHeaders(token),
    },
  );
  const payload = (await res.json().catch(() => ({}))) as
    | ServiceStarterPackResponse
    | LaravelValidationPayload;
  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError("Failed to apply starter services", res.status, payload);
  }

  return payload as ServiceStarterPackResponse;
}
