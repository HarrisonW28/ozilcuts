import type { ProductionSecurityReview } from "@ozilcuts/types";

import { ApiError } from "./auth";
import { getApiBaseUrl } from "./base";

export async function fetchProductionSecurityReview(
  token: string,
): Promise<ProductionSecurityReview> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/admin/production-security`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError("Failed to load production security review", res.status, payload);
  }

  const body = payload as { data: ProductionSecurityReview };

  return body.data;
}
