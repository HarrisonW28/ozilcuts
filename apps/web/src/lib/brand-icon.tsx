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
export const BRAND_ICON_FG = "#ffffff";

export type BrandIconJsxProps = {
  size: number;
  /** Reduce the inner mark so it stays inside the maskable safe zone (~80%). */
  maskable?: boolean;
};

export function BrandIconJsx({ size, maskable = false }: BrandIconJsxProps) {
  const radius = Math.round(size * 0.22);
  const safeFraction = maskable ? 0.78 : 1;
  const inner = Math.round(size * safeFraction);
  const fontSize = Math.round(inner * 0.46);

  const wrapStyle: CSSProperties = {
    width: size,
    height: size,
    background: BRAND_ICON_BG,
    borderRadius: maskable ? 0 : radius,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const markStyle: CSSProperties = {
    width: inner,
    height: inner,
    background: BRAND_ICON_BG,
    borderRadius: maskable ? Math.round(inner * 0.28) : 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: BRAND_ICON_FG,
    fontSize,
    fontWeight: 700,
    letterSpacing: -fontSize * 0.04,
    fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
  };

  return (
    <div style={wrapStyle}>
      <div style={markStyle}>OC</div>
    </div>
  );
}
