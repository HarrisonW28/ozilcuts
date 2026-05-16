import type {
  AppointmentArrivalProximityResponse,
  AppointmentCalendarLink,
  AppointmentListFilters,
  AppointmentPendingPayment,
  AppointmentQueueIntelligenceResponse,
  AppointmentRecord,
  BarberSlotsPayload,
  BarberSmartSlotHintsPayload,
  CreateAppointmentInput,
  CreateAppointmentResponse,
  CreateWalkInAppointmentInput,
  LaravelValidationPayload,
  Paginated,
  RescheduleAppointmentInput,
  UpdateAppointmentArrivalInput,
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

export type FetchBarberSlotsOptions = {
  /** When set, the server treats the given appointment as if it didn't exist. */
  excludeAppointmentId?: number;
};

export async function fetchBarberSlots(
  userId: number,
  serviceId: number,
  /** YYYY-MM-DD */
  date: string,
  options: FetchBarberSlotsOptions = {},
): Promise<BarberSlotsPayload> {
  const url = new URL(`${getApiBaseUrl()}/api/v1/barbers/${userId}/slots`);
  url.searchParams.set("service_id", String(serviceId));
  url.searchParams.set("date", date);
  if (options.excludeAppointmentId !== undefined) {
    url.searchParams.set(
      "exclude_appointment_id",
      String(options.excludeAppointmentId),
    );
  }
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load slots", res.status, payload);
  }

  return res.json() as Promise<BarberSlotsPayload>;
}

export async function fetchBarberSmartSlotHints(
  barberUserId: number,
  serviceId: number,
  /** YYYY-MM-DD */
  date: string,
  token?: string | null,
): Promise<BarberSmartSlotHintsPayload> {
  const url = new URL(
    `${getApiBaseUrl()}/api/v1/barbers/${barberUserId}/smart-slot-hints`,
  );
  url.searchParams.set("service_id", String(serviceId));
  url.searchParams.set("date", date);
  const headers: HeadersInit = { Accept: "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url.toString(), {
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load slot hints", res.status, payload);
  }

  return res.json() as Promise<BarberSmartSlotHintsPayload>;
}

export async function createWalkInAppointment(
  token: string,
  body: CreateWalkInAppointmentInput,
): Promise<CreateAppointmentResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/appointments/walk-in`, {
    method: "POST",
    headers: authJsonHeaders(token),
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => ({}))) as
    | CreateAppointmentResponse
    | LaravelValidationPayload;
  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError("Failed to log walk-in", res.status, payload);
  }

  return payload as CreateAppointmentResponse;
}

export async function createAppointment(
  token: string,
  body: CreateAppointmentInput,
): Promise<CreateAppointmentResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/appointments`, {
    method: "POST",
    headers: authJsonHeaders(token),
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => ({}))) as
    | CreateAppointmentResponse
    | LaravelValidationPayload;
  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    const abuse = payload as { message?: string };
    const message =
      res.status === 429 && typeof abuse.message === "string"
        ? abuse.message
        : "Failed to book appointment";
    throw new ApiError(message, res.status, payload);
  }

  return payload as CreateAppointmentResponse;
}

export async function fetchMyAppointments(
  token: string,
  filters: AppointmentListFilters = {},
): Promise<Paginated<AppointmentRecord>> {
  const url = new URL(`${getApiBaseUrl()}/api/v1/appointments`);
  url.searchParams.set("page", String(filters.page ?? 1));
  if (filters.status && filters.status !== "all") {
    url.searchParams.set("status", filters.status);
  }
  if (filters.range && filters.range !== "all") {
    url.searchParams.set("range", filters.range);
  }
  if (filters.from) {
    url.searchParams.set("from", filters.from);
  }
  if (filters.to) {
    url.searchParams.set("to", filters.to);
  }
  if (filters.perPage) {
    url.searchParams.set("per_page", String(filters.perPage));
  }
  const res = await fetch(url.toString(), {
    headers: authJsonHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load appointments", res.status, payload);
  }

  return res.json() as Promise<Paginated<AppointmentRecord>>;
}

export async function fetchAppointment(
  token: string,
  appointmentId: number,
): Promise<AppointmentRecord> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}`,
    {
      headers: authJsonHeaders(token),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load appointment", res.status, payload);
  }

  return res.json() as Promise<AppointmentRecord>;
}

export async function fetchAppointmentQueueIntelligence(
  token: string,
  appointmentId: number,
): Promise<AppointmentQueueIntelligenceResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/queue-intelligence`,
    {
      headers: authJsonHeaders(token),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load queue insight", res.status, payload);
  }

  return res.json() as Promise<AppointmentQueueIntelligenceResponse>;
}

export async function cancelAppointment(
  token: string,
  appointmentId: number,
): Promise<AppointmentRecord> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/cancel`,
    {
      method: "PATCH",
      headers: authJsonHeaders(token),
    },
  );
  const payload = (await res.json().catch(() => ({}))) as
    | AppointmentRecord
    | LaravelValidationPayload;
  if (!res.ok) {
    throw new ApiError("Failed to cancel appointment", res.status, payload);
  }

  return payload as AppointmentRecord;
}

export async function rescheduleAppointment(
  token: string,
  appointmentId: number,
  body: RescheduleAppointmentInput,
): Promise<AppointmentRecord> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/reschedule`,
    {
      method: "PATCH",
      headers: authJsonHeaders(token),
      body: JSON.stringify(body),
    },
  );
  const payload = (await res.json().catch(() => ({}))) as
    | AppointmentRecord
    | LaravelValidationPayload;
  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError("Failed to reschedule appointment", res.status, payload);
  }

  return payload as AppointmentRecord;
}

export async function updateAppointmentArrival(
  token: string,
  appointmentId: number,
  body: UpdateAppointmentArrivalInput,
): Promise<AppointmentRecord> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/arrival`,
    {
      method: "PATCH",
      headers: authJsonHeaders(token),
      body: JSON.stringify(body),
    },
  );
  const payload = (await res.json().catch(() => ({}))) as
    | AppointmentRecord
    | LaravelValidationPayload;
  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    throw new ApiError("Failed to update arrival", res.status, payload);
  }

  return payload as AppointmentRecord;
}

export type PostAppointmentArrivalProximityInput = {
  lat: number;
  lng: number;
};

export async function postAppointmentArrivalProximity(
  token: string,
  appointmentId: number,
  body: PostAppointmentArrivalProximityInput,
): Promise<AppointmentArrivalProximityResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/arrival-proximity`,
    {
      method: "POST",
      headers: authJsonHeaders(token),
      body: JSON.stringify(body),
    },
  );
  const payload = (await res.json().catch(() => ({}))) as
    | AppointmentArrivalProximityResponse
    | LaravelValidationPayload;

  if (!res.ok) {
    if (res.status === 422) {
      throw new ApiValidationError(
        res.status,
        payload as LaravelValidationPayload,
      );
    }
    const body = payload as LaravelValidationPayload;
    const message =
      typeof body.message === "string"
        ? body.message
        : "Arrival proximity request failed";
    throw new ApiError(message, res.status, payload);
  }

  return payload as AppointmentArrivalProximityResponse;
}

export async function fetchAppointmentCalendarLink(
  token: string,
  appointmentId: number,
): Promise<AppointmentCalendarLink> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/calendar-url`,
    {
      headers: authJsonHeaders(token),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load calendar link", res.status, payload);
  }

  return res.json() as Promise<AppointmentCalendarLink>;
}

export async function fetchAppointmentPaymentIntent(
  token: string,
  appointmentId: number,
): Promise<AppointmentPendingPayment> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/payment-intent`,
    {
      headers: authJsonHeaders(token),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to load payment intent", res.status, payload);
  }

  return res.json() as Promise<AppointmentPendingPayment>;
}

export type SendAppointmentReminderResponse = {
  sent: true;
  /** ISO 8601 */
  sent_at: string;
};

export async function sendAppointmentReminder(
  token: string,
  appointmentId: number,
): Promise<SendAppointmentReminderResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/reminder`,
    {
      method: "POST",
      headers: authJsonHeaders(token),
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to send reminder", res.status, payload);
  }

  return res.json() as Promise<SendAppointmentReminderResponse>;
}

export type SendAppointmentRunningLateResponse = {
  sent: true;
  /** ISO 8601 */
  sent_at: string;
};

export async function sendAppointmentRunningLate(
  token: string,
  appointmentId: number,
  lateByMinutes: number,
): Promise<SendAppointmentRunningLateResponse> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/v1/appointments/${appointmentId}/running-late`,
    {
      method: "POST",
      headers: authJsonHeaders(token),
      body: JSON.stringify({ late_by_minutes: lateByMinutes }),
    },
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError("Failed to send running late notice", res.status, payload);
  }

  return res.json() as Promise<SendAppointmentRunningLateResponse>;
}
