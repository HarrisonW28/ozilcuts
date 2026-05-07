import type {
  CreateCustomerNoteInput,
  CustomerNote,
  CustomerNotesResponse,
  CustomerTag,
  CustomerTagSuggestionsResponse,
  CustomerTagsResponse,
  LaravelValidationPayload,
  UpdateCustomerNoteInput,
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

export async function fetchCustomerNotes(
  token: string,
  customerUserId: number,
): Promise<CustomerNotesResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/customers/${customerUserId}/notes`,
    {
      headers: authJsonHeaders(token),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load customer notes", res.status, payload);
  }

  return res.json() as Promise<CustomerNotesResponse>;
}

export async function createCustomerNote(
  token: string,
  customerUserId: number,
  body: CreateCustomerNoteInput,
): Promise<CustomerNote> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/customers/${customerUserId}/notes`,
    {
      method: "POST",
      headers: authJsonHeaders(token),
      body: JSON.stringify(body),
    },
  );
  const payload = (await res.json().catch(() => ({}))) as
    | CustomerNote
    | LaravelValidationPayload;
  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError("Failed to create note", res.status, payload);
  }

  return payload as CustomerNote;
}

export async function updateCustomerNote(
  token: string,
  noteId: number,
  body: UpdateCustomerNoteInput,
): Promise<CustomerNote> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/customer-notes/${noteId}`,
    {
      method: "PATCH",
      headers: authJsonHeaders(token),
      body: JSON.stringify(body),
    },
  );
  const payload = (await res.json().catch(() => ({}))) as
    | CustomerNote
    | LaravelValidationPayload;
  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError("Failed to update note", res.status, payload);
  }

  return payload as CustomerNote;
}

export async function deleteCustomerNote(
  token: string,
  noteId: number,
): Promise<void> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/customer-notes/${noteId}`,
    {
      method: "DELETE",
      headers: authJsonHeaders(token),
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to delete note", res.status, payload);
  }
}

export async function fetchCustomerTags(
  token: string,
  customerUserId: number,
): Promise<CustomerTagsResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/customers/${customerUserId}/tags`,
    {
      headers: authJsonHeaders(token),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load customer tags", res.status, payload);
  }

  return res.json() as Promise<CustomerTagsResponse>;
}

export async function attachCustomerTag(
  token: string,
  customerUserId: number,
  label: string,
): Promise<CustomerTag> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/customers/${customerUserId}/tags`,
    {
      method: "POST",
      headers: authJsonHeaders(token),
      body: JSON.stringify({ label }),
    },
  );
  const payload = (await res.json().catch(() => ({}))) as
    | CustomerTag
    | LaravelValidationPayload;
  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError("Failed to attach tag", res.status, payload);
  }

  return payload as CustomerTag;
}

export async function detachCustomerTag(
  token: string,
  tagId: number,
): Promise<void> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/customer-tags/${tagId}`,
    {
      method: "DELETE",
      headers: authJsonHeaders(token),
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to remove tag", res.status, payload);
  }
}

export async function fetchCustomerTagSuggestions(
  token: string,
  query?: string,
  limit?: number,
): Promise<CustomerTagSuggestionsResponse> {
  const url = new URL(`${getApiBaseUrl()}/api/v1/customer-tags/suggestions`);
  if (query !== undefined && query !== "") url.searchParams.set("q", query);
  if (limit !== undefined) url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    headers: authJsonHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load tag suggestions", res.status, payload);
  }

  return res.json() as Promise<CustomerTagSuggestionsResponse>;
}
