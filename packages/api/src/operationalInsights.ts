import type {
  LaravelValidationPayload,
  OperationalInsightsRangeFilters,
  OperationalInsightsReport,
} from "@ozilcuts/types";

import { ApiError, ApiValidationError } from "./auth";
import { getApiBaseUrl } from "./base";

function authHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchOperationalInsights(
  token: string,
  filters: OperationalInsightsRangeFilters,
): Promise<OperationalInsightsReport> {
  const url = new URL(`${getApiBaseUrl()}/api/v1/admin/reports/operations`);
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
      "Failed to load operational insights",
      res.status,
      payload,
    );
  }

  return res.json() as Promise<OperationalInsightsReport>;
}
