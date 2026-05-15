import type { RebookSuggestion } from "@ozilcuts/types";

export type BookUrlParams = {
  serviceId?: number;
  barberUserId?: number;
  date?: string;
  /** Surface compact pickers + prioritize confirm (returning customers). */
  express?: boolean;
};

export function buildBookHref(params: BookUrlParams = {}): string {
  const q = new URLSearchParams();
  if (params.serviceId !== undefined) {
    q.set("service_id", String(params.serviceId));
  }
  if (params.barberUserId !== undefined) {
    q.set("barber_user_id", String(params.barberUserId));
  }
  if (params.date) {
    q.set("date", params.date);
  }
  if (params.express) {
    q.set("express", "1");
  }
  const query = q.toString();
  return query ? `/book?${query}` : "/book";
}

export function buildBookFromRebookHint(
  hint: RebookSuggestion,
  options: { express?: boolean } = {},
): string {
  return buildBookHref({
    serviceId: hint.service_id,
    barberUserId: hint.barber_user_id,
    date: hint.suggested_date,
    express: options.express ?? true,
  });
}

export function buildBookFromAppointmentRow(row: {
  service?: { id: number } | null;
  barber?: { id: number } | null;
}): string | null {
  if (!row.service?.id || !row.barber?.id) return null;
  return buildBookHref({
    serviceId: row.service.id,
    barberUserId: row.barber.id,
    express: true,
  });
}

export function buildFavouriteBarberBookHref(
  barberUserId: number,
  remembered: { serviceId: number; barberId: number; dateYmd?: string } | null,
): string {
  if (remembered?.barberId === barberUserId) {
    return buildBookHref({
      serviceId: remembered.serviceId,
      barberUserId: remembered.barberId,
      date: remembered.dateYmd,
      express: true,
    });
  }
  return buildBookHref({ barberUserId, express: true });
}
