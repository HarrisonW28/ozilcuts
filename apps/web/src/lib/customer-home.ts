import type { AppointmentRecord } from "@ozilcuts/types";

export const VISIT_MILESTONES = [3, 6, 10, 15, 25] as const;

export function formatUpcomingStart(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatUpcomingDay(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function formatUpcomingTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatIsoDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function pickNextUpcoming(
  rows: AppointmentRecord[],
): AppointmentRecord | null {
  const now = Date.now();
  const candidates = rows.filter(
    (r) =>
      r.status === "confirmed" &&
      r.starts_at !== null &&
      new Date(r.starts_at).getTime() >= now - 60_000,
  );
  candidates.sort((a, b) => {
    const ta = new Date(a.starts_at!).getTime();
    const tb = new Date(b.starts_at!).getTime();
    return ta - tb;
  });
  return candidates[0] ?? null;
}

export type LoyaltyProgress = {
  label: string;
  pct: number;
  next: number | null;
  totalVisits: number;
};

export function milestoneProgress(totalVisits: number): LoyaltyProgress {
  if (totalVisits < 1) {
    return {
      label: "Book your first visit to start your journey.",
      pct: 0,
      next: VISIT_MILESTONES[0],
      totalVisits,
    };
  }
  const next = VISIT_MILESTONES.find((m) => m > totalVisits) ?? null;
  if (next === null) {
    return {
      label: `${totalVisits} visits — you're a studio regular.`,
      pct: 100,
      next: null,
      totalVisits,
    };
  }
  const prev =
    VISIT_MILESTONES.filter((m) => m <= totalVisits).pop() ?? 0;
  const span = next - prev;
  const pct = Math.min(
    100,
    Math.round(((totalVisits - prev) / Math.max(1, span)) * 100),
  );
  return {
    label: `${totalVisits} visit${totalVisits === 1 ? "" : "s"} on file`,
    pct,
    next,
    totalVisits,
  };
}
