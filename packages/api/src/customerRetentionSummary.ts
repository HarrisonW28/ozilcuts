import type { CustomerRetentionSummary } from "@ozilcuts/types";

import { ApiError } from "./auth";
import { getApiBaseUrl } from "./base";

function authHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

type CustomerRetentionSummaryEnvelope = {
  data: CustomerRetentionSummary;
};

export async function fetchCustomerRetentionSummary(
  token: string,
): Promise<CustomerRetentionSummary> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/customer/retention-summary`,
    {
      headers: authHeaders(token),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load retention summary", res.status, payload);
  }

  const body = (await res.json()) as CustomerRetentionSummaryEnvelope;
  return body.data;
}
