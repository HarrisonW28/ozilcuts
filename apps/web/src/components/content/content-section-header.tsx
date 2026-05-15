"use client";

import { cn } from "@ozilcuts/ui";
import type { ReactNode } from "react";

type ContentSectionHeaderProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function ContentSectionHeader({
  id,
  eyebrow,
  title,
  description,
  action,
  className,
}: ContentSectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border/40 pb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        {eyebrow ? (
          <p className="brand-section-label">{eyebrow}</p>
        ) : null}
        <h2
          id={id}
          className="text-title font-semibold tracking-tight text-foreground sm:text-title-lg"
        >
          {title}
        </h2>
        {description ? (
          <div className="text-body text-muted-foreground sm:text-body-lg">
            {description}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
