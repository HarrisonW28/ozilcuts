import type { CSSProperties } from "react";

/**
 * Single source of truth for the installable-app brand mark. The same
 * JSX is rendered into 32×32, 180×180, 192×192 and 512×512 PNGs by the
 * Next.js metadata routes so the favicon, iOS apple-touch-icon and the
 * manifest icons stay visually identical without shipping bitmap
 * assets.
 *
 * Colors are intentionally hard-coded (not theme tokens) because the
 * icon is rendered server-side via `next/og` ImageResponse, which has
 * no access to the runtime CSS theme.
 */
export const BRAND_ICON_BG = "#0a0a0a";
/** Gold accent aligned with `--brand-accent` (oklch 0.72 0.11 55). */
export const BRAND_ICON_GOLD = "#d4af37";
export const BRAND_ICON_GOLD_DIM = "#a88628";

export type BrandIconJsxProps = {
  size: number;
  /** Reduce the inner mark so it stays inside the maskable safe zone (~80%). */
  maskable?: boolean;
};

function BarberScissorsMark({ markSize }: { markSize: number }) {
  const stroke = Math.max(2, markSize * 0.052);

  return (
    <svg
      width={markSize}
      height={markSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Pivot */}
      <circle cx="50" cy="44" r="4.5" fill={BRAND_ICON_GOLD} />
      <circle cx="50" cy="44" r="2" fill={BRAND_ICON_BG} />

      {/* Blades — open upward */}
      <path
        d="M50 42 L18 11 L32 20 L50 42 Z"
        fill={BRAND_ICON_GOLD}
      />
      <path
        d="M50 42 L82 11 L68 20 L50 42 Z"
        fill={BRAND_ICON_GOLD}
      />
      <path
        d="M50 42 L18 11 M50 42 L82 11"
        stroke={BRAND_ICON_GOLD_DIM}
        strokeWidth={stroke * 0.35}
        strokeLinecap="round"
      />

      {/* Arms */}
      <path
        d="M50 48 L36 64 L28 78"
        stroke={BRAND_ICON_GOLD}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M50 48 L64 64 L72 78"
        stroke={BRAND_ICON_GOLD}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Handles at bottom */}
      <circle
        cx="26"
        cy="86"
        r="11"
        stroke={BRAND_ICON_GOLD}
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx="74"
        cy="86"
        r="11"
        stroke={BRAND_ICON_GOLD}
        strokeWidth={stroke}
        fill="none"
      />
      <circle cx="26" cy="86" r="4" fill={BRAND_ICON_GOLD_DIM} opacity={0.5} />
      <circle cx="74" cy="86" r="4" fill={BRAND_ICON_GOLD_DIM} opacity={0.5} />
    </svg>
  );
}

export function BrandIconJsx({ size, maskable = false }: BrandIconJsxProps) {
  const radius = Math.round(size * 0.22);
  const safeFraction = maskable ? 0.76 : 0.88;
  const markSize = Math.round(size * safeFraction);

  const wrapStyle: CSSProperties = {
    width: size,
    height: size,
    background: BRAND_ICON_BG,
    borderRadius: maskable ? 0 : radius,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div style={wrapStyle}>
      <BarberScissorsMark markSize={markSize} />
    </div>
  );
}
