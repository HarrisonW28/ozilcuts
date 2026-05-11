import type { StaffCustomerLookupRow } from "@ozilcuts/types";

import { ApiError } from "./auth";
import { getApiBaseUrl } from "./base";

function authJsonHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchStaffCustomerSearch(
  token: string,
  query: string,
): Promise<StaffCustomerLookupRow[]> {
  const q = query.trim();
  if (q.length < 2) {
    return [];
  }

  const url = new URL(`${getApiBaseUrl()}/api/v1/staff/customers/search`);
  url.searchParams.set("q", q);

  const res = await fetch(url.toString(), {
    headers: authJsonHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to search customers", res.status, payload);
  }

  const body = (await res.json()) as { data: StaffCustomerLookupRow[] };
  return body.data ?? [];
}
