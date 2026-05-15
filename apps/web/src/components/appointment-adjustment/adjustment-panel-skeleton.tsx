import { Skeleton } from "@ozilcuts/ui";

export function AdjustmentPanelSkeleton() {
  return (
    <div
      className="space-y-2"
      aria-busy="true"
      aria-label="Loading move options"
    >
      <Skeleton className="h-11 w-full rounded-lg" />
      <Skeleton className="h-11 w-full rounded-lg sm:max-w-[66%]" />
      <Skeleton className="h-11 w-full rounded-lg sm:max-w-[50%]" />
    </div>
  );
}
