import type { RebookSuggestion } from "@ozilcuts/types";

import { ApiError } from "./auth";
import { getApiBaseUrl } from "./base";

function authHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

type RebookSuggestionEnvelope = {
  data: RebookSuggestion | null;
};

export async function fetchAppointmentRebookHint(
  token: string,
  appointmentId: number,
): Promise<RebookSuggestion | null> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/rebook-hint`,
    {
      headers: authHeaders(token),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load rebook hint", res.status, payload);
  }

  const body = (await res.json()) as RebookSuggestionEnvelope;
  return body.data ?? null;
}

export async function fetchNextVisitSuggestion(
  token: string,
): Promise<RebookSuggestion | null> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/customer/next-visit`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load next visit suggestion", res.status, payload);
  }

  const body = (await res.json()) as RebookSuggestionEnvelope;
  return body.data ?? null;
}
