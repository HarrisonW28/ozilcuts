import type { HaircutPhoto } from "@ozilcuts/types";

export {
  layoutPortfolioPhotos,
  type PortfolioGalleryItem,
} from "@/lib/portfolio-layout";

export type MasonryTileAspect = "wide" | "portrait" | "square";

/** Editorial rhythm for single-photo masonry tiles. */
export function masonryAspectForIndex(index: number): MasonryTileAspect {
  if (index % 5 === 0) return "wide";
  if (index % 2 === 0) return "portrait";
  return "square";
}

export function masonryAspectClass(aspect: MasonryTileAspect): string {
  switch (aspect) {
    case "wide":
      return "aspect-[21/9] max-h-[min(22rem,55vw)] sm:max-h-none";
    case "portrait":
      return "aspect-[4/5]";
    default:
      return "aspect-square";
  }
}

export function masonryImageSizes(
  aspect: MasonryTileAspect,
  wide: boolean,
): string {
  if (wide || aspect === "wide") {
    return "(min-width: 1024px) 80vw, 92vw";
  }
  return "(min-width: 1024px) 28vw, (min-width: 768px) 40vw, 88vw";
}

export function kindBadgeClasses(kind: "before" | "after"): string {
  return kind === "before"
    ? "border-border/60 bg-background/75 text-muted-foreground"
    : "border-primary/25 bg-primary/15 text-foreground";
}

export function portfolioPhotoAlt(
  photo: HaircutPhoto,
  barberName?: string,
): string {
  if (photo.caption) return photo.caption;
  const who = barberName ? `${barberName} — ` : "";
  return `${who}${photo.kind === "before" ? "Before" : "After"} cut`;
}

export type LightboxPayload = {
  url: string;
  alt: string;
  caption: string | null;
};
