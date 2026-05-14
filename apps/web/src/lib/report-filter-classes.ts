/**
 * Layout and control styles for report / analytics filter cards.
 * Native `type="date"` inputs have a wide intrinsic min-width; pairing
 * `min-w-0` on grid children avoids horizontal overflow on phones.
 */
export const reportFilterControlClass =
  "border-input bg-background text-foreground focus-visible:ring-ring/50 box-border min-h-11 min-w-0 w-full max-w-full rounded-lg border px-3 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:h-10 sm:text-sm";

export const reportFilterFieldCellClass = "flex min-w-0 flex-col gap-2";

/** From + To (and similar two-field rows). */
export const reportFilterTwoColGridClass =
  "grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4";

/** From + To + third control (e.g. granularity). */
export const reportFilterThreeColGridClass =
  "grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3 md:gap-4";

export const reportFilterPresetsGridClass =
  "grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2";

export const reportFilterPresetButtonClass =
  "min-h-11 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground hover:bg-muted/60 sm:w-auto sm:min-h-9 sm:px-3";

export const reportFilterActionsClass =
  "flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center";

export const reportFilterActionButtonClass = "w-full sm:w-auto";
