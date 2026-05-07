import type { PaymentConfig } from "@ozilcuts/types";

import { ApiError } from "./auth";
import { getApiBaseUrl } from "./base";

export async function fetchPaymentConfig(): Promise<PaymentConfig> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/payments/config`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load payment config", res.status, payload);
  }

  return res.json() as Promise<PaymentConfig>;
}
