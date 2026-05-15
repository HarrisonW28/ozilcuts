"use client";

import { cn } from "@ozilcuts/ui";
import { Shield } from "lucide-react";

type CustomerSummaryPrivacyDisclosureProps = {
  staffOnly: string;
  thirdParty: string | null;
  className?: string;
};

export function CustomerSummaryPrivacyDisclosure({
  staffOnly,
  thirdParty,
  className,
}: CustomerSummaryPrivacyDisclosureProps) {
  return (
    <details
      className={cn(
        "group rounded-xl border border-border/40 bg-muted/15 open:bg-muted/25 dark:border-border/35 dark:bg-muted/10 dark:open:bg-muted/20",
        className,
      )}
    >
      <summary
        className={cn(
          "flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium text-foreground outline-none transition-colors",
          "marker:content-none [&::-webkit-details-marker]:hidden",
          "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-offset-background",
        )}
      >
        <Shield
          className="size-4 shrink-0 text-violet-600 dark:text-violet-300"
          aria-hidden
        />
        <span className="min-w-0">Privacy &amp; who can see this</span>
        <span className="ms-auto text-caption font-normal text-muted-foreground group-open:hidden">
          Tap to expand
        </span>
      </summary>
      <div className="space-y-2 border-t border-border/35 px-3 pb-3 pt-2 text-caption leading-relaxed text-muted-foreground dark:border-border/25">
        <p>{staffOnly}</p>
        {thirdParty ? <p>{thirdParty}</p> : null}
      </div>
    </details>
  );
}
