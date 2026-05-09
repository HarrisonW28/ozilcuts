import * as React from "react";

import { cn } from "../lib/utils";

export type EmptyStateProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

/**
 * Standard "no data here yet" affordance for analytics tables and
 * lists. Renders a dashed-outline panel with a clear title, optional
 * supporting copy, and an optional next-action slot — replaces the
 * scattered `<p class="text-muted-foreground">No X.</p>` lines.
 */
function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      role="status"
      className={cn(
        "flex flex-col items-start gap-2 rounded-xl border border-dashed border-border/60 bg-muted/5 px-4 py-7 text-sm shadow-xs",
        className,
      )}
    >
      <p className="font-semibold tracking-tight text-foreground">{title}</p>
      {description ? (
        <div className="text-sm text-muted-foreground">{description}</div>
      ) : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
