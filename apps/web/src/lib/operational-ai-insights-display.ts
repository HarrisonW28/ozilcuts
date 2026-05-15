import type { OperationalAiInsightConfidence } from "@ozilcuts/types";

export function operationalInsightKeyLabel(key: string): string {
  const map: Record<string, string> = {
    barbers: "Barbers on roster",
    confirmed_in_range: "Confirmed in range",
    top_hour_bookings: "Peak hour bookings",
    peak_load_index: "Peak load index",
    top_three_share: "Top 3 windows share",
    completed_visits: "Completed visits",
    no_show_proxy: "No-show proxy count",
    no_show_proxy_rate: "Proxy no-show rate",
    due_soon: "Due for rebook soon",
    inactive_eligible: "Inactive — eligible",
    due_soon_paused: "Due soon (paused)",
    inactive_paused: "Inactive (paused)",
  };
  if (map[key]) return map[key];
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatOperationalMetricValue(
  key: string,
  value: number | string,
): string {
  if (typeof value === "string") return value;
  if (
    (key.includes("rate") || key.includes("share")) &&
    value >= 0 &&
    value <= 1.0001
  ) {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (key.includes("load_index")) {
    return `${value.toFixed(2)}×`;
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  return String(value);
}

export function operationalConfidenceLabel(
  c: OperationalAiInsightConfidence,
): string {
  switch (c) {
    case "high":
      return "High confidence — ample history in this slice";
    case "medium":
      return "Medium confidence";
    default:
      return "Low confidence — thin data in this slice";
  }
}
