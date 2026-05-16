import type {
  CustomerPrivacySnapshot,
  DeleteCustomerAccountInput,
  UpdateCustomerPrivacyInput,
} from "@ozilcuts/types";

import { ApiError, ApiValidationError } from "./auth";
import { getApiBaseUrl } from "./base";

function authJsonHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

type CustomerPrivacyEnvelope = {
  data: CustomerPrivacySnapshot;
};

export async function fetchCustomerPrivacy(
  token: string,
): Promise<CustomerPrivacySnapshot> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/customer/privacy`, {
    headers: authJsonHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load privacy settings", res.status, payload);
  }

  const body = (await res.json()) as CustomerPrivacyEnvelope;

  return body.data;
}

export async function updateCustomerPrivacy(
  token: string,
  input: UpdateCustomerPrivacyInput,
): Promise<CustomerPrivacySnapshot> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/customer/privacy`, {
    method: "PATCH",
    headers: authJsonHeaders(token),
    body: JSON.stringify(input),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(res.status, payload);
    }
    throw new ApiError("Failed to update privacy settings", res.status, payload);
  }

  const body = payload as CustomerPrivacyEnvelope;

  return body.data;
}

export async function exportCustomerData(token: string): Promise<Blob> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/customer/privacy/export`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to export your data", res.status, payload);
  }

  return res.blob();
}

export async function deleteCustomerAccount(
  token: string,
  input: DeleteCustomerAccountInput,
): Promise<void> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/customer/privacy/delete-account`,
    {
      method: "POST",
      headers: authJsonHeaders(token),
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    if (res.status === 422) {
      throw new ApiValidationError(res.status, payload);
    }
    throw new ApiError("Failed to delete account", res.status, payload);
  }
}
