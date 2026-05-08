import type {
  CustomerAnalyticsAggregate,
  CustomerAnalyticsRangeFilters,
  CustomerAnalyticsResponse,
  LaravelValidationPayload,
} from "@ozilcuts/types";

import { ApiError, ApiValidationError } from "./auth";
import { getApiBaseUrl } from "./base";

function authHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchCustomerAnalyticsAggregate(
  token: string,
  filters: CustomerAnalyticsRangeFilters,
): Promise<CustomerAnalyticsAggregate> {
  const url = new URL(`${getApiBaseUrl()}/api/v1/admin/reports/customers`);
  url.searchParams.set("from", filters.from);
  url.searchParams.set("to", filters.to);
  const res = await fetch(url.toString(), {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError(
      "Failed to load customer analytics",
      res.status,
      payload,
    );
  }

  return res.json() as Promise<CustomerAnalyticsAggregate>;
}

export async function fetchCustomerAnalytics(
  token: string,
  customerUserId: number,
): Promise<CustomerAnalyticsResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/admin/customers/${customerUserId}/analytics`,
    {
      headers: authHeaders(token),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(
      "Failed to load customer drilldown",
      res.status,
      payload,
    );
  }

  return res.json() as Promise<CustomerAnalyticsResponse>;
}

export async function fetchMyVisitsSummary(
  token: string,
): Promise<CustomerAnalyticsResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/customer/visits`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load visit summary", res.status, payload);
  }

  return res.json() as Promise<CustomerAnalyticsResponse>;
}
