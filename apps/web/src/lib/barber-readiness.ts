import type {
  AppointmentCustomerAiSummaryResponse,
  AppointmentCustomerInsightsResponse,
  CustomerNote,
  HairProfilePhoto,
  HaircutPhoto,
} from "@ozilcuts/types";

export const READINESS_MAX_PROFILE_THUMBS = 4;
export const READINESS_MAX_VISIT_THUMBS = 4;
export const READINESS_MAX_NOTE_PREVIEW = 2;
export const READINESS_MAX_HISTORY_ROWS = 2;
export const READINESS_NOTE_BODY_CHARS = 140;

export type ReadinessThumb = {
  key: string;
  url: string;
  alt: string;
};

export type LoadSlice<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: T }
  | { status: "error"; message: string };

export function truncatePlain(text: string, maxLen: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

export function sortNotesForPreview(notes: CustomerNote[]): CustomerNote[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const ta = new Date(a.updated_at ?? a.created_at ?? 0).getTime();
    const tb = new Date(b.updated_at ?? b.created_at ?? 0).getTime();
    return tb - ta;
  });
}

export function profileThumbsFromPhotos(
  photos: HairProfilePhoto[],
  max = READINESS_MAX_PROFILE_THUMBS,
): ReadinessThumb[] {
  return photos.slice(0, max).map((p, i) => ({
    key: `hp-${p.id}`,
    url: p.url,
    alt: p.caption?.trim()
      ? `Hair reference: ${p.caption}`
      : `Hair reference photo ${i + 1}`,
  }));
}

export function visitThumbsFromPhotos(
  photos: HaircutPhoto[],
  max = READINESS_MAX_VISIT_THUMBS,
): ReadinessThumb[] {
  return photos.slice(0, max).map((p, i) => ({
    key: `vp-${p.id}`,
    url: p.url,
    alt: p.caption?.trim()
      ? `${p.kind} photo: ${p.caption}`
      : `${p.kind} visit photo ${i + 1}`,
  }));
}

export function linkedInsights(
  insights: AppointmentCustomerInsightsResponse | null,
): Extract<AppointmentCustomerInsightsResponse, { linked_customer: true }> | null {
  if (!insights || insights.linked_customer !== true) return null;
  return insights;
}

export function aiSummaryHasContent(
  data: AppointmentCustomerAiSummaryResponse | null,
): boolean {
  if (!data) return false;
  const s = data.sections;
  return Boolean(
    s.hair_preferences ||
      s.visit_summary ||
      s.notes_digest ||
      s.operational_signals,
  );
}

/** One-line digest for the top of chair prep — fastest scan path. */
export function readinessSummaryDigest(
  data: AppointmentCustomerAiSummaryResponse,
): string | null {
  const parts = [
    data.sections.hair_preferences,
    data.sections.visit_summary,
    data.sections.notes_digest,
    data.sections.operational_signals,
  ].filter((p): p is string => Boolean(p?.trim()));

  if (parts.length === 0) return null;
  return truncatePlain(parts.join(" · "), 220);
}

export function readinessConfirmationBase(appointmentId: number): string {
  return `/appointments/${appointmentId}/confirmation`;
}
