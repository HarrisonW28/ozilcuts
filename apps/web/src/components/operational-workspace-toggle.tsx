"use client";

import { useOperationalWorkspaceMode } from "@/lib/operational-workspace-context";
import { cn } from "@ozilcuts/ui";

type OperationalWorkspaceToggleProps = {
  className?: string;
  /** Larger touch targets for header placement */
  compact?: boolean;
};

export function OperationalWorkspaceToggle({
  className,
  compact = false,
}: OperationalWorkspaceToggleProps) {
  const { mode, setMode } = useOperationalWorkspaceMode();

  return (
    <div
      className={cn("flex flex-col gap-1", className)}
      role="group"
      aria-label="Workspace complexity"
    >
      {!compact ? (
        <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:block">
          Workspace
        </span>
      ) : null}
      <div
        className={cn(
          "inline-flex rounded-lg border border-border/70 bg-muted/25 p-0.5",
          compact ? "w-full" : "",
        )}
      >
        <button
          type="button"
          className={cn(
            "motion-interactive flex-1 rounded-md px-2 py-2 text-center text-xs font-semibold transition-colors sm:px-3 sm:py-1.5 sm:text-xs",
            mode === "focused"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
            compact ? "min-h-11 sm:min-h-9" : "min-h-10 sm:min-h-8",
          )}
          aria-pressed={mode === "focused"}
          onClick={() => setMode("focused")}
        >
          Simple
        </button>
        <button
          type="button"
          className={cn(
            "motion-interactive flex-1 rounded-md px-2 py-2 text-center text-xs font-semibold transition-colors sm:px-3 sm:py-1.5 sm:text-xs",
            mode === "full"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
            compact ? "min-h-11 sm:min-h-9" : "min-h-10 sm:min-h-8",
          )}
          aria-pressed={mode === "full"}
          onClick={() => setMode("full")}
        >
          Full
        </button>
      </div>
    </div>
  );
}
