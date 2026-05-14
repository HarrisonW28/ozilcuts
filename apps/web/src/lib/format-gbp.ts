/**
 * Amounts are stored as integer minor units (pence). API fields keep the
 * historic `*_cents` naming.
 */
export function formatGbp(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pence / 100);
}

/** Plain pounds string for admin forms (two decimal places). */
export function poundsInputFromPence(pence: number): string {
  return (pence / 100).toFixed(2);
}

/** Parses a pounds input; optional £ and commas allowed. */
export function penceFromPoundsInput(raw: string): number {
  const s = raw.trim().replace(/£/g, "").replace(/,/g, "");
  if (s === "") return NaN;
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}
