import type { AppointmentRecord } from "@ozilcuts/types";

import { milestoneProgress, type LoyaltyProgress } from "@/lib/customer-home";

export type MonthlyVisitStreakStats = {
  /** Consecutive calendar months (most recent visit month backward) with ≥1 confirmed past visit. */
  currentStreakMonths: number;
  /** Longest run of consecutive months with a visit across history. */
  bestStreakMonths: number;
  /** Distinct months that include a confirmed past visit. */
  uniqueActiveMonths: number;
};

function ymKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function prevYm(ym: string): string {
  const [yStr, mStr] = ym.split("-");
  let y = Number(yStr);
  let m = Number(mStr) - 1;
  if (m < 1) {
    m = 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

function nextYm(ym: string): string {
  const [yStr, mStr] = ym.split("-");
  let y = Number(yStr);
  let m = Number(mStr) + 1;
  if (m > 12) {
    m = 1;
    y += 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

function pastConfirmedVisits(
  rows: AppointmentRecord[],
  nowMs: number,
): AppointmentRecord[] {
  return rows.filter(
    (r) =>
      r.status === "confirmed" &&
      r.starts_at !== null &&
      new Date(r.starts_at).getTime() < nowMs,
  );
}

/**
 * Counts consecutive calendar months with at least one confirmed past visit.
 */
export function computeMonthlyVisitStreak(
  rows: AppointmentRecord[],
  nowMs = Date.now(),
): MonthlyVisitStreakStats {
  const visits = pastConfirmedVisits(rows, nowMs);
  const months = new Set<string>();
  for (const r of visits) {
    months.add(ymKey(new Date(r.starts_at!)));
  }

  if (months.size === 0) {
    return {
      currentStreakMonths: 0,
      bestStreakMonths: 0,
      uniqueActiveMonths: 0,
    };
  }

  const sortedAsc = [...months].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sortedAsc.length; i++) {
    const prev = sortedAsc[i - 1];
    const curr = sortedAsc[i];
    if (prev !== undefined && curr !== undefined && nextYm(prev) === curr) {
      run += 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
  }

  const sortedDesc = [...months].sort().reverse();
  const anchor = sortedDesc[0]!;
  let currentStreakMonths = 0;
  let cursor = anchor;
  while (months.has(cursor)) {
    currentStreakMonths += 1;
    cursor = prevYm(cursor);
  }

  return {
    currentStreakMonths,
    bestStreakMonths: best,
    uniqueActiveMonths: months.size,
  };
}

export type LoyaltyIdentityTier = {
  title: string;
  description: string;
};

export function loyaltyTierCopy(totalVisits: number): LoyaltyIdentityTier {
  if (totalVisits < 1) {
    return {
      title: "First visit ahead",
      description:
        "When you sit in the chair, your story here begins — visits, streaks, and milestones unlock automatically.",
    };
  }
  if (totalVisits < 3) {
    return {
      title: "Finding your rhythm",
      description:
        "You're building trust with your barber. A few more visits and the chair really starts to feel like yours.",
    };
  }
  if (totalVisits < 6) {
    return {
      title: "Familiar face",
      description:
        "You're not a stranger anymore — your preferences and timing are taking shape.",
    };
  }
  if (totalVisits < 10) {
    return {
      title: "Studio regular",
      description:
        "Consistency is showing. Keep the cadence — your cuts stay sharper when you stay steady.",
    };
  }
  if (totalVisits < 15) {
    return {
      title: "Inner circle",
      description:
        "You're part of the fabric here. Thank you for coming back again and again.",
    };
  }
  if (totalVisits < 25) {
    return {
      title: "Cornerstone guest",
      description:
        "Years from now, this chair will still remember you. That's rare — and we don't take it for granted.",
    };
  }
  return {
    title: "Studio legend",
    description:
      "You've shaped this place as much as it's shaped your look. We're grateful you're in our corner.",
  };
}

export function loyaltyProgressFromVisits(
  totalVisits: number,
): LoyaltyProgress | null {
  if (totalVisits < 1) return null;
  return milestoneProgress(totalVisits);
}

export function sortHistoryVisually(
  rows: AppointmentRecord[],
): AppointmentRecord[] {
  return [...rows].sort((a, b) => {
    const ta = a.starts_at ? new Date(a.starts_at).getTime() : 0;
    const tb = b.starts_at ? new Date(b.starts_at).getTime() : 0;
    return tb - ta;
  });
}
