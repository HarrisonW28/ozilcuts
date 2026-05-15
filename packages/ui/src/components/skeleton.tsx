import * as React from "react";

import { cn } from "../lib/utils";

/**
 * Visual placeholder used while real content is loading. Skeletons are
 * decorative on their own (`aria-hidden`); pair them with an explicit
 * `role="status"` wrapper so screen readers hear a single "loading"
 * announcement rather than one per block.
 *
 * Uses a subtle shimmer (reduced to a calm pulse when the user prefers
 * reduced motion).
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        "relative isolate overflow-hidden rounded-md bg-muted/60",
        "motion-reduce:animate-pulse motion-reduce:bg-muted/70",
        className,
      )}
      {...props}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]",
          "motion-reduce:hidden",
        )}
      >
        <div
          className={cn(
            "absolute inset-y-0 -left-1/4 w-[55%] -skew-x-12",
            "bg-gradient-to-r from-transparent via-foreground/[0.07] to-transparent",
            "dark:via-foreground/[0.11]",
            "motion-safe:animate-ozilcuts-shimmer",
          )}
        />
      </div>
    </div>
  );
}

export { Skeleton };
