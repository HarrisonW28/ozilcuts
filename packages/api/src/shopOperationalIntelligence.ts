import type { ShopOperationalLiveSnapshot } from "@ozilcuts/types";

import { ApiError } from "./auth";
import { getApiBaseUrl } from "./base";

function authHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

type ShopOperationalLiveEnvelope = {
  data: ShopOperationalLiveSnapshot;
};

export async function fetchShopOperationalLive(
  token: string,
): Promise<ShopOperationalLiveSnapshot> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/operations/live`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(
      "Failed to load live shop operations",
      res.status,
      payload,
    );
  }

  const body = (await res.json()) as ShopOperationalLiveEnvelope;

  return body.data;
}
