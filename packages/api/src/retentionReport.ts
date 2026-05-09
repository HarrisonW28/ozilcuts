import type { RetentionReportSnapshot } from "@ozilcuts/types";

import { ApiError } from "./auth";
import { getApiBaseUrl } from "./base";

function authHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchRetentionReport(
  token: string,
): Promise<RetentionReportSnapshot> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/admin/reports/retention`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load retention report", res.status, payload);
  }

  return res.json() as Promise<RetentionReportSnapshot>;
}
