import type { HaircutPhoto } from "@ozilcuts/types";

export type PortfolioGalleryItem =
  | {
      type: "pair";
      appointment_id: number;
      before: HaircutPhoto;
      after: HaircutPhoto;
    }
  | { type: "single"; photo: HaircutPhoto };

/**
 * Groups the first before + first after per appointment into a single row
 * when both exist, preserving API order for the rest.
 */
export function layoutPortfolioPhotos(
  photos: HaircutPhoto[],
): PortfolioGalleryItem[] {
  const firstBefore = new Map<number, HaircutPhoto>();
  const firstAfter = new Map<number, HaircutPhoto>();
  for (const p of photos) {
    if (p.kind === "before" && !firstBefore.has(p.appointment_id)) {
      firstBefore.set(p.appointment_id, p);
    }
    if (p.kind === "after" && !firstAfter.has(p.appointment_id)) {
      firstAfter.set(p.appointment_id, p);
    }
  }
  const pairable = new Set<number>();
  for (const apptId of firstBefore.keys()) {
    if (firstAfter.has(apptId)) pairable.add(apptId);
  }

  const used = new Set<number>();
  const out: PortfolioGalleryItem[] = [];

  for (const p of photos) {
    if (used.has(p.id)) continue;
    const b = firstBefore.get(p.appointment_id);
    const a = firstAfter.get(p.appointment_id);
    if (
      b &&
      a &&
      pairable.has(p.appointment_id) &&
      (p.id === b.id || p.id === a.id)
    ) {
      used.add(b.id);
      used.add(a.id);
      out.push({
        type: "pair",
        appointment_id: p.appointment_id,
        before: b,
        after: a,
      });
    } else {
      used.add(p.id);
      out.push({ type: "single", photo: p });
    }
  }

  return out;
}
