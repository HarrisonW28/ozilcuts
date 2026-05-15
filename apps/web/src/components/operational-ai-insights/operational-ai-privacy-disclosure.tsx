"use client";

import type { OperationalAiInsightsPayload } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";
import { Shield } from "lucide-react";

type OperationalAiPrivacyDisclosureProps = {
  privacy: OperationalAiInsightsPayload["privacy"];
  generatedAt: string;
  source: OperationalAiInsightsPayload["source"];
  className?: string;
};

export function OperationalAiPrivacyDisclosure({
  privacy,
  generatedAt,
  source,
  className,
}: OperationalAiPrivacyDisclosureProps) {
  const when = new Date(generatedAt);
  const whenLabel = Number.isNaN(when.getTime())
    ? generatedAt
    : when.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-muted/10 dark:bg-muted/15",
        className,
      )}
    >
      <div className="border-b border-border/40 px-4 py-3 dark:border-border/35">
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          Operational intelligence
        </h3>
        <p className="mt-1 text-caption leading-relaxed text-muted-foreground sm:text-sm">
          {source === "model"
            ? "Staffing predictions, busy-period forecasting, no-show analysis, and retention insights — wording refined with AI on aggregate metrics only."
            : "Staffing predictions, busy-period forecasting, no-show analysis, and retention insights — generated from shop rules on live data."}{" "}
          <time dateTime={generatedAt} className="text-foreground/90">
            {whenLabel}
          </time>
        </p>
      </div>
      <details className="group">
        <summary
          className={cn(
            "flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-sm font-medium outline-none",
            "marker:content-none [&::-webkit-details-marker]:hidden",
            "focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-offset-background",
          )}
        >
          <Shield
            className="size-4 shrink-0 text-primary"
            aria-hidden
          />
          <span>Privacy &amp; data use</span>
          <span className="ms-auto text-caption font-normal text-muted-foreground group-open:hidden">
            Expand
          </span>
        </summary>
        <div className="space-y-2 border-t border-border/40 px-4 pb-3 pt-2 text-caption leading-relaxed text-muted-foreground dark:border-border/35">
          <p>{privacy.staff_only}</p>
          {privacy.third_party ? <p>{privacy.third_party}</p> : null}
        </div>
      </details>
    </div>
  );
}
