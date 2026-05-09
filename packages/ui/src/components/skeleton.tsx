import * as React from "react";

import { cn } from "../lib/utils";

/**
 * Visual placeholder used while real content is loading. Skeletons are
 * decorative on their own (`aria-hidden`); pair them with an explicit
 * `role="status"` wrapper so screen readers hear a single "loading"
 * announcement rather than one per shimmer.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse rounded-md bg-muted/70", className)}
      {...props}
    />
  );
}

export { Skeleton };
