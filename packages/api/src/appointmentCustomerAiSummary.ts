import type {
  AppointmentCustomerAiSummaryResponse,
  LaravelValidationPayload,
} from "@ozilcuts/types";

import { ApiError, ApiValidationError } from "./auth";
import { getApiBaseUrl } from "./base";

function authHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchAppointmentCustomerAiSummary(
  token: string,
  appointmentId: number,
): Promise<AppointmentCustomerAiSummaryResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/customer-ai-summary`,
    {
      headers: authHeaders(token),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError(
      "Failed to load customer summary",
      res.status,
      payload,
    );
  }

  return res.json() as Promise<AppointmentCustomerAiSummaryResponse>;
}
