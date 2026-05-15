"use client";

import { cn } from "@ozilcuts/ui";
import type { LucideIcon } from "lucide-react";

type CustomerSummarySectionCardProps = {
  title: string;
  body: string;
  icon: LucideIcon;
  className?: string;
};

export function CustomerSummarySectionCard({
  title,
  body,
  icon: Icon,
  className,
}: CustomerSummarySectionCardProps) {
  return (
    <article
      className={cn(
        "rounded-xl border border-border/45 bg-background/60 p-3.5 shadow-xs dark:border-border/35 dark:bg-background/45",
        className,
      )}
    >
      <h3 className="flex items-start gap-2 text-micro font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon
          className="mt-0.5 size-4 shrink-0 text-violet-600 dark:text-violet-300"
          aria-hidden
        />
        <span className="min-w-0 leading-snug">{title}</span>
      </h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {body}
      </p>
    </article>
  );
}
