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
        "flex flex-col items-start gap-1 rounded-lg border border-dashed border-border/70 bg-muted/10 px-4 py-6 text-sm",
        className,
      )}
    >
      <p className="font-medium text-foreground">{title}</p>
      {description ? (
        <div className="text-sm text-muted-foreground">{description}</div>
      ) : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
