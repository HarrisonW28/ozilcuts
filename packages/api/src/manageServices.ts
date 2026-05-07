import type {
  CreateServiceInput,
  LaravelValidationPayload,
  Paginated,
  ServiceManageRow,
  UpdateServiceInput,
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

export async function fetchManageServices(
  token: string,
  page = 1,
): Promise<Paginated<ServiceManageRow>> {
  const url = new URL(`${getApiBaseUrl()}/api/v1/manage/services`);
  url.searchParams.set("page", String(page));
  const res = await fetch(url.toString(), {
    headers: authJsonHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load services", res.status, payload);
  }

  return res.json() as Promise<Paginated<ServiceManageRow>>;
}

export async function createManagedService(
  token: string,
  body: CreateServiceInput,
): Promise<ServiceManageRow> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/manage/services`, {
    method: "POST",
    headers: authJsonHeaders(token),
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => ({}))) as
    | ServiceManageRow
    | LaravelValidationPayload;
  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError("Failed to create service", res.status, payload);
  }

  return payload as ServiceManageRow;
}

export async function updateManagedService(
  token: string,
  serviceId: number,
  body: UpdateServiceInput,
): Promise<ServiceManageRow> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/manage/services/${serviceId}`,
    {
      method: "PATCH",
      headers: authJsonHeaders(token),
      body: JSON.stringify(body),
    },
  );
  const payload = (await res.json().catch(() => ({}))) as
    | ServiceManageRow
    | LaravelValidationPayload;
  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError("Failed to update service", res.status, payload);
  }

  return payload as ServiceManageRow;
}

export async function deleteManagedService(
  token: string,
  serviceId: number,
): Promise<void> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/manage/services/${serviceId}`,
    {
      method: "DELETE",
      headers: authJsonHeaders(token),
    },
  );
  if (res.status === 204) {
    return;
  }
  const payload = await res.json().catch(() => ({}));
  throw new ApiError("Failed to delete service", res.status, payload);
}
