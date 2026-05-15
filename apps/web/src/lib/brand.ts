/**
 * Brand design system constants for JS/TS (Sprint 20.1).
 * CSS tokens live in `styles/ozilcuts-brand-tokens.css`.
 */

export const brandTypography = {
  display: "text-display font-semibold tracking-display",
  titleLg: "text-title-lg font-semibold tracking-editorial",
  title: "text-title font-semibold tracking-ui",
  bodyLg: "text-body-lg leading-body",
  body: "text-body leading-body",
  caption: "text-caption leading-snug",
  micro: "text-micro leading-snug",
  eyebrow:
    "text-caption font-semibold uppercase tracking-widecaps text-muted-foreground",
} as const;

export type BrandTypographyVariant = keyof typeof brandTypography;

export const brandElevation = {
  0: "shadow-none",
  1: "shadow-elev-1",
  2: "shadow-elev-2",
  3: "shadow-elev-3",
  4: "shadow-elev-4",
} as const;

export type BrandElevationLevel = keyof typeof brandElevation;

export const brandIconSize = {
  xs: "size-[var(--icon-size-xs)]",
  sm: "size-[var(--icon-size-sm)]",
  md: "size-[var(--icon-size-md)]",
  lg: "size-[var(--icon-size-lg)]",
  xl: "size-[var(--icon-size-xl)]",
  "2xl": "size-[var(--icon-size-2xl)]",
} as const;

export type BrandIconSize = keyof typeof brandIconSize;

export const brandStackGap = {
  sm: "gap-[var(--stack-gap-sm)]",
  md: "gap-[var(--stack-gap-md)]",
  lg: "gap-[var(--stack-gap-lg)]",
} as const;

export type BrandStackGap = keyof typeof brandStackGap;

export const brandMotion = {
  enter: "motion-enter",
  contentIn: "motion-content-in",
  interactive: "motion-interactive",
  card: "motion-card",
  pressable: "brand-pressable",
} as const;

/** Stagger delay for list items (respects reduced motion via CSS). */
export function brandStaggerDelay(index: number, stepMs = 40): string {
  const capped = Math.min(Math.max(0, index), 8);
  return `${capped * stepMs}ms`;
}
