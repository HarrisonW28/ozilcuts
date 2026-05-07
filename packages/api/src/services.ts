import type { ServiceSummary } from "@ozilcuts/types";

import { ApiError } from "./auth";
import { getApiBaseUrl } from "./base";

type ServicesPayload = { data: ServiceSummary[] };

export async function fetchServices(): Promise<ServiceSummary[]> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/services`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load services", res.status, payload);
  }
  const body = (await res.json()) as ServicesPayload;

  return body.data;
}
