import type {
  AdminSecurityReview,
  AuditLogIndexResponse,
} from "@ozilcuts/types";

import { ApiError } from "./auth";
import { getApiBaseUrl } from "./base";

function authHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export type FetchAuditLogsParams = {
  category?: string;
  action?: string;
  severity?: string;
  actor_user_id?: number;
  from?: string;
  to?: string;
  page?: number;
};

export async function fetchAdminAuditLogs(
  token: string,
  params: FetchAuditLogsParams = {},
): Promise<AuditLogIndexResponse> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      qs.set(key, String(value));
    }
  }
  const query = qs.toString();
  const url = `${getApiBaseUrl()}/api/v1/admin/audit-logs${query ? `?${query}` : ""}`;

  const res = await fetch(url, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError("Failed to load audit logs", res.status, payload);
  }

  return payload as AuditLogIndexResponse;
}

export async function fetchAdminSecurityReview(
  token: string,
): Promise<AdminSecurityReview> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/admin/security-review`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError("Failed to load security review", res.status, payload);
  }

  const body = payload as { data: AdminSecurityReview };

  return body.data;
}
