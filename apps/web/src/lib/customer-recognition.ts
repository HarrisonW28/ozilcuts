import type {
  CustomerHairPreferencesSnapshot,
  CustomerRecognitionTier,
  HairLength,
  HairThickness,
  HairType,
  ScalpCondition,
} from "@ozilcuts/types";

export function tierPresentation(tier: CustomerRecognitionTier | string): {
  label: string;
  hint: string;
  className: string;
} {
  switch (tier) {
    case "vip":
      return {
        label: "Inner circle",
        hint: "A loyal regular — small touches go a long way.",
        className:
          "border-violet-500/35 bg-violet-500/10 text-violet-950 dark:text-violet-100",
      };
    case "regular":
      return {
        label: "Regular",
        hint: "Knows your shop rhythm — keep the visit smooth.",
        className:
          "border-emerald-500/35 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100",
      };
    case "returning":
      return {
        label: "Returning",
        hint: "Building the relationship — a warm hello lands well.",
        className:
          "border-sky-500/35 bg-sky-500/10 text-sky-950 dark:text-sky-100",
      };
    case "first_visit":
      return {
        label: "First visit",
        hint: "Extra clarity on expectations helps everyone relax.",
        className:
          "border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-50",
      };
    default:
      return {
        label: "Guest",
        hint: "",
        className: "border-border/50 bg-muted/20 text-foreground",
      };
  }
}

export function formatHistoryWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const HAIR_TYPE_LABELS: Record<HairType, string> = {
  straight: "Straight",
  wavy: "Wavy",
  curly: "Curly",
  coily: "Coily",
};

const HAIR_THICKNESS_LABELS: Record<HairThickness, string> = {
  fine: "Fine",
  medium: "Medium",
  thick: "Thick",
};

const HAIR_LENGTH_LABELS: Record<HairLength, string> = {
  very_short: "Very short",
  short: "Short",
  medium: "Medium",
  long: "Long",
};

const SCALP_CONDITION_LABELS: Record<ScalpCondition, string> = {
  normal: "Normal",
  dry: "Dry",
  oily: "Oily",
  sensitive: "Sensitive",
};

export type HairPreferenceLine = { label: string; value: string };

export function hairPreferenceLines(
  prefs: CustomerHairPreferencesSnapshot,
): HairPreferenceLine[] {
  const lines: HairPreferenceLine[] = [];

  if (prefs.hair_type) {
    lines.push({ label: "Type", value: HAIR_TYPE_LABELS[prefs.hair_type] });
  }
  if (prefs.hair_thickness) {
    lines.push({
      label: "Thickness",
      value: HAIR_THICKNESS_LABELS[prefs.hair_thickness],
    });
  }
  if (prefs.hair_length) {
    lines.push({ label: "Length", value: HAIR_LENGTH_LABELS[prefs.hair_length] });
  }
  if (prefs.scalp_condition) {
    lines.push({
      label: "Scalp",
      value: SCALP_CONDITION_LABELS[prefs.scalp_condition],
    });
  }
  if (prefs.preferred_clipper_guard?.trim()) {
    lines.push({ label: "Guard", value: prefs.preferred_clipper_guard.trim() });
  }
  if (prefs.allergies?.trim()) {
    lines.push({ label: "Allergies", value: prefs.allergies.trim() });
  }
  if (prefs.styling_notes?.trim()) {
    lines.push({ label: "Styling", value: prefs.styling_notes.trim() });
  }

  return lines;
}

export function compactHairPreferenceSummary(
  prefs: CustomerHairPreferencesSnapshot | null,
): string | null {
  if (!prefs) return null;
  const lines = hairPreferenceLines(prefs);
  if (lines.length === 0) return null;
  return lines.map((l) => l.value).join(" · ");
}
