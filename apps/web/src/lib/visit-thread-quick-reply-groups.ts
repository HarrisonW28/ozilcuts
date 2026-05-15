/**
 * Groups operational keys for appointment-scoped quick replies (UI only).
 * Preserves API order within each bucket.
 */

export type VisitThreadQuickReplyGroup = {
  id: string;
  /** Short heading — not generic chat. */
  title: string;
  keys: string[];
};

function partitionKeys(
  keys: string[],
  bucketDefs: readonly { id: string; title: string; test: (k: string) => boolean }[],
): VisitThreadQuickReplyGroup[] {
  const buckets = new Map<string, string[]>();
  const titles = new Map<string, string>();
  for (const d of bucketDefs) {
    buckets.set(d.id, []);
    titles.set(d.id, d.title);
  }
  const other: string[] = [];

  for (const k of keys) {
    const def = bucketDefs.find((d) => d.test(k));
    if (def) {
      buckets.get(def.id)!.push(k);
    } else {
      other.push(k);
    }
  }

  const out: VisitThreadQuickReplyGroup[] = [];
  for (const d of bucketDefs) {
    const ks = buckets.get(d.id)!;
    if (ks.length > 0) {
      out.push({ id: d.id, title: titles.get(d.id)!, keys: ks });
    }
  }
  if (other.length > 0) {
    out.push({ id: "more", title: "More", keys: other });
  }

  return out;
}

const SHOP_BUCKETS = [
  {
    id: "late",
    title: "Running late",
    test: (k: string) => /^running_\d+$/.test(k),
  },
  {
    id: "parking",
    title: "Parking",
    test: (k: string) => k === "parking_help",
  },
  {
    id: "outside",
    title: "Outside now",
    test: (k: string) => k === "outside_now",
  },
  {
    id: "chair",
    title: "Chair ready",
    test: (k: string) =>
      [
        "chair_ready",
        "almost_ready",
        "thanks_patience",
        "ready_relaxed",
      ].includes(k),
  },
] as const;

const GUEST_BUCKETS = [
  {
    id: "late",
    title: "Running late / ETA",
    test: (k: string) =>
      k === "slightly_late" || k.startsWith("eta_about_"),
  },
  {
    id: "parking",
    title: "Parking",
    test: (k: string) => k.startsWith("parking_"),
  },
  {
    id: "outside",
    title: "Outside & arrival",
    test: (k: string) =>
      ["outside_now", "arriving_now", "at_the_door"].includes(k),
  },
  {
    id: "flow",
    title: "On the way / chair",
    test: (k: string) => ["on_my_way", "chair_heading"].includes(k),
  },
] as const;

export function partitionShopOperationalQuickReplies(
  keys: string[],
): VisitThreadQuickReplyGroup[] {
  return partitionKeys(keys, SHOP_BUCKETS);
}

export function partitionGuestOperationalQuickReplies(
  keys: string[],
): VisitThreadQuickReplyGroup[] {
  return partitionKeys(keys, GUEST_BUCKETS);
}
