import type {
  RevenueReport,
  RevenueReportFilters,
} from "@ozilcuts/types";

import { ApiError, ApiValidationError } from "./auth";
import { getApiBaseUrl } from "./base";
import type { LaravelValidationPayload } from "@ozilcuts/types";

function authHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function buildQuery(filters: RevenueReportFilters): URLSearchParams {
  const params = new URLSearchParams({
    from: filters.from,
    to: filters.to,
  });
  if (filters.granularity) {
    params.set("granularity", filters.granularity);
  }
  return params;
}

export async function fetchRevenueReport(
  token: string,
  filters: RevenueReportFilters,
): Promise<RevenueReport> {
  const url = new URL(`${getApiBaseUrl()}/api/v1/admin/reports/revenue`);
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
    throw new ApiError("Failed to load revenue report", res.status, payload);
  }

  return res.json() as Promise<RevenueReport>;
}

/**
 * Trigger a CSV download in the browser. Wraps fetch + Blob to keep auth
 * headers attached (signed download links would expire too quickly here).
 */
export async function downloadRevenueReportCsv(
  token: string,
  filters: RevenueReportFilters,
): Promise<void> {
  const url = new URL(`${getApiBaseUrl()}/api/v1/admin/reports/revenue.csv`);
  url.search = buildQuery(filters).toString();
  const res = await fetch(url.toString(), {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to download CSV", res.status, payload);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = `revenue_${filters.from}_${filters.to}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
