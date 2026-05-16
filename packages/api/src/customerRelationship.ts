import type {
  CustomerRelationshipSnapshot,
  UpdateCustomerVipInput,
} from "@ozilcuts/types";

import { ApiError } from "./auth";
import { getApiBaseUrl } from "./base";

function authJsonHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

type CustomerRelationshipEnvelope = {
  data: CustomerRelationshipSnapshot;
};

export async function fetchCustomerRelationship(
  token: string,
  customerUserId: number,
): Promise<CustomerRelationshipSnapshot> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/customers/${customerUserId}/relationship`,
    {
      headers: authJsonHeaders(token),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(
      "Failed to load customer relationship",
      res.status,
      payload,
    );
  }

  const body = (await res.json()) as CustomerRelationshipEnvelope;

  return body.data;
}

export async function fetchSelfCustomerRelationship(
  token: string,
): Promise<CustomerRelationshipSnapshot> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/customer/relationship`, {
    headers: authJsonHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(
      "Failed to load your relationship profile",
      res.status,
      payload,
    );
  }

  const body = (await res.json()) as CustomerRelationshipEnvelope;

  return body.data;
}

export async function updateCustomerVip(
  token: string,
  customerUserId: number,
  input: UpdateCustomerVipInput,
): Promise<CustomerRelationshipSnapshot> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/customers/${customerUserId}/relationship/vip`,
    {
      method: "PATCH",
      headers: authJsonHeaders(token),
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to update VIP status", res.status, payload);
  }

  const body = (await res.json()) as CustomerRelationshipEnvelope;

  return body.data;
}
