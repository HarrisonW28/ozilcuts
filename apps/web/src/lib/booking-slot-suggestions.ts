import { formatYmd } from "@/lib/calendar-week";
import type { BarberSmartSlotHintsPayload } from "@ozilcuts/types";

export type SlotDisplayItem = {
  slot: string;
  /** Highlight as a smart pick. */
  suggested: boolean;
  /** Accessible hint for why this slot is surfaced first. */
  suggestionReason?: "preferred_time" | "soonest" | "cancellation_signal";
};

function slotHourLocal(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return -1;
  return new Date(iso).getHours();
}

function preferredWeightForHour(
  hour: number,
  hints: BarberSmartSlotHintsPayload | null | undefined,
): number {
  if (!hints || hints.preferred_time_windows.length === 0) return 0;
  let max = 0;
  for (const w of hints.preferred_time_windows) {
    if (w.hour_start === hour) {
      max = Math.max(max, w.weight);
    }
  }
  return max;
}

/**
 * Order slots for display: prefer the customer's usual hours when hints are
 * present; otherwise favour soonest upcoming times today.
 */
export function orderSlotsWithSuggestions(
  slots: string[],
  dateYmd: string,
  now: Date = new Date(),
  hints?: BarberSmartSlotHintsPayload | null,
): SlotDisplayItem[] {
  if (slots.length === 0) return [];

  const unique = Array.from(new Set(slots));
  const todayYmd = formatYmd(now);
  const isToday = dateYmd === todayYmd;
  const nowMs = now.getTime();
  const graceMs = 90_000;

  const sortedByTime = unique.sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );

  const pool = isToday
    ? sortedByTime.filter((s) => {
        const t = new Date(s).getTime();
        return !Number.isNaN(t) && t >= nowMs - graceMs;
      })
    : sortedByTime;

  const ordered = pool.length > 0 ? pool : sortedByTime;

  const cancelBoost =
    hints && hints.cancellation_match.recent_cancellations_on_day > 0
      ? hints.preferred_time_windows.length === 0
        ? 0.15
        : 0.08
      : 0;

  const scored = ordered.map((slot) => {
    const h = slotHourLocal(slot);
    const prefW = preferredWeightForHour(h, hints ?? null);
    const t = new Date(slot).getTime();
    const soon = isToday && !Number.isNaN(t) ? Math.max(0, 1_000_000 - (t - nowMs)) : 0;
    const score = prefW * 120 + soon / 50_000 + cancelBoost * 40;

    let suggestionReason: SlotDisplayItem["suggestionReason"];
    if (prefW > 0) {
      suggestionReason = "preferred_time";
    } else if (cancelBoost > 0 && isToday) {
      suggestionReason = "cancellation_signal";
    } else {
      suggestionReason = "soonest";
    }

    return { slot, score, suggestionReason };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(a.slot).getTime() - new Date(b.slot).getTime();
  });

  const topSuggested = new Set(
    scored.slice(0, Math.min(3, scored.length)).map((r) => r.slot),
  );

  return scored.map(({ slot, suggestionReason }) => ({
    slot,
    suggested: topSuggested.has(slot),
    suggestionReason: topSuggested.has(slot) ? suggestionReason : undefined,
  }));
}
