import type {
  BarberAnalyticsCompareResponse,
  BarberAnalyticsRangeFilters,
  BarberAnalyticsReport,
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

function buildQuery(filters: BarberAnalyticsRangeFilters): URLSearchParams {
  return new URLSearchParams({ from: filters.from, to: filters.to });
}

export async function fetchBarberAnalytics(
  token: string,
  barberUserId: number,
  filters: BarberAnalyticsRangeFilters,
): Promise<BarberAnalyticsReport> {
  const url = new URL(
    `${getApiBaseUrl()}/api/v1/barbers/${barberUserId}/analytics`,
  );
  url.search = buildQuery(filters).toString();
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
    throw new ApiError("Failed to load barber analytics", res.status, payload);
  }

  return res.json() as Promise<BarberAnalyticsReport>;
}

export async function fetchBarberAnalyticsCompare(
  token: string,
  filters: BarberAnalyticsRangeFilters,
): Promise<BarberAnalyticsCompareResponse> {
  const url = new URL(`${getApiBaseUrl()}/api/v1/admin/reports/barbers`);
  url.search = buildQuery(filters).toString();
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
      "Failed to load barber compare report",
      res.status,
      payload,
    );
  }

  return res.json() as Promise<BarberAnalyticsCompareResponse>;
}
