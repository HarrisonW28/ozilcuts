export function formatAdjustmentWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Human-readable delta from the current booking time (e.g. "+20 min", "−15 min"). */
export function formatSuggestionOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "Same time";
  if (offsetMinutes > 0) return `+${offsetMinutes} min`;
  return `${offsetMinutes} min`;
}
