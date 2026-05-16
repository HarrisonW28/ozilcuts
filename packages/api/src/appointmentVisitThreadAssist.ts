import type { VisitThreadAssistPayload } from "@ozilcuts/types";

import { ApiError } from "./auth";
import { getApiBaseUrl } from "./base";

function authHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchVisitThreadAssist(
  token: string,
  appointmentId: number,
): Promise<VisitThreadAssistPayload> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/visit-thread-assist`,
    { headers: authHeaders(token), cache: "no-store" },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Could not load writing suggestions", res.status, payload);
  }
  return res.json() as Promise<VisitThreadAssistPayload>;
}
