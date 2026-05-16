import type { AppointmentReview, BarberTrustSummary } from "@ozilcuts/types";

import { ApiError } from "./auth";
import { getApiBaseUrl } from "./base";

type BarberTrustEnvelope = {
  data: BarberTrustSummary;
};

type AppointmentReviewEnvelope = {
  data: AppointmentReview;
};

export async function fetchBarberTrust(
  barberUserId: number,
): Promise<BarberTrustSummary> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/barbers/${barberUserId}/trust`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load barber trust", res.status, payload);
  }

  const body = (await res.json()) as BarberTrustEnvelope;
  return body.data;
}

export async function submitAppointmentReview(
  token: string,
  appointmentId: number,
  input: { rating: number; body: string },
): Promise<AppointmentReview> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/review`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to submit review", res.status, payload);
  }

  const body = (await res.json()) as AppointmentReviewEnvelope;
  return body.data;
}
