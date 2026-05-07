import type {
  AuthSuccessResponse,
  AuthUser,
  LaravelValidationPayload,
} from "@ozilcuts/types";

import { getApiBaseUrl } from "./base";

/** Full URL to start Google OAuth (API redirects to Google). Empty if API base URL is unknown (set NEXT_PUBLIC_API_URL). */
export function getGoogleOAuthRedirectUrl(): string {
  const base = getApiBaseUrl();
  if (!base) return "";
  return `${base}/api/v1/auth/google/redirect`;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiValidationError extends ApiError {
  constructor(
    status: number,
    public readonly body: LaravelValidationPayload,
  ) {
    super(body.message ?? "Request failed", status, body);
    this.name = "ApiValidationError";
  }

  fieldErrors(): Record<string, string[]> {
    return this.body.errors ?? {};
  }

  firstMessage(): string | undefined {
    const errs = this.body.errors;
    if (!errs) return this.body.message;
    const firstKey = Object.keys(errs)[0];
    return firstKey ? errs[firstKey]?.[0] : this.body.message;
  }
}

const jsonHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
} as const;

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<AuthSuccessResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/auth/register`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
  const payload = (await res.json().catch(() => ({}))) as
    | AuthSuccessResponse
    | LaravelValidationPayload;
  if (!res.ok) {
    throw new ApiValidationError(res.status, payload as LaravelValidationPayload);
  }
  return payload as AuthSuccessResponse;
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<AuthSuccessResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/auth/login`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
  const payload = (await res.json().catch(() => ({}))) as
    | AuthSuccessResponse
    | LaravelValidationPayload;
  if (!res.ok) {
    throw new ApiValidationError(res.status, payload as LaravelValidationPayload);
  }
  return payload as AuthSuccessResponse;
}

export async function logoutUser(token: string): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/auth/logout`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok && res.status !== 204) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Logout failed", res.status, payload);
  }
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/user`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load user", res.status, payload);
  }
  return res.json() as Promise<AuthUser>;
}
