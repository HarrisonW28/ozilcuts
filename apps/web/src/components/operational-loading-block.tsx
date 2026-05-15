import { Skeleton } from "@ozilcuts/ui";

/**
 * Branded loading skeleton for barber / admin operational surfaces.
 * Uses the shared `@ozilcuts/ui` skeleton (shimmer + reduced-motion pulse).
 */
export function OperationalLoadingBlock({
  label = "Loading",
  variant = "default",
}: {
  label?: string;
  /** `chair` mirrors day overview + timeline height for barber calendar. */
  variant?: "default" | "chair";
}) {
  if (variant === "chair") {
    return (
      <div
        className="space-y-5 rounded-2xl border border-border/50 bg-muted/10 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px)+0.75rem)] sm:p-6"
        role="status"
        aria-busy="true"
        aria-label={label}
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_minmax(0,18rem)] sm:items-start">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-6 w-48 max-w-[90%] rounded-md" />
            <Skeleton className="h-4 w-full max-w-md rounded-md" />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[4.25rem] rounded-xl sm:h-20" />
            ))}
          </div>
        </div>
        <div className="flex gap-0 overflow-hidden rounded-xl border border-border/40 bg-background/40">
          <div className="w-12 shrink-0 space-y-6 border-r border-border/40 py-2 sm:w-14">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="mx-auto h-2 w-6 rounded" />
            ))}
          </div>
          <Skeleton className="min-h-[min(52vh,640px)] min-w-0 flex-1 rounded-none" />
        </div>
        <p className="text-xs text-muted-foreground">{label}…</p>
      </div>
    );
  }

  return (
    <div
      className="space-y-4 rounded-xl border border-border/50 bg-muted/15 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px)+0.5rem)] sm:p-6"
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <div className="flex items-center gap-2">
        <Skeleton className="h-3.5 w-32 max-w-[45%] rounded-md sm:h-4" />
        <Skeleton className="h-3.5 flex-1 rounded-md sm:h-4" />
      </div>
      <Skeleton className="h-28 w-full rounded-lg sm:h-32" />
      <p className="text-xs text-muted-foreground">{label}…</p>
    </div>
  );
}
