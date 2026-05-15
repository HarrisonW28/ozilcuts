import { AdjustmentPanelSkeleton } from "./adjustment-panel-skeleton";

export function AdjustmentSlotsRefreshBlock() {
  return (
    <div
      className="space-y-2"
      aria-busy="true"
      aria-live="polite"
      aria-label="Updating nearby time options"
    >
      <p className="text-xs font-medium text-muted-foreground">
        Updating nearby times for your new slot…
      </p>
      <AdjustmentPanelSkeleton />
    </div>
  );
}
