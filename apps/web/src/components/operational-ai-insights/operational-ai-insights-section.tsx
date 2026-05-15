"use client";

import type { OperationalAiInsightsPayload } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";

import { OperationalAiInsightCardView } from "./operational-ai-insight-card";
import { OperationalAiPrivacyDisclosure } from "./operational-ai-privacy-disclosure";

export type OperationalAiInsightsSectionProps = {
  insights: OperationalAiInsightsPayload;
  className?: string;
};

export function OperationalAiInsightsSection({
  insights,
  className,
}: OperationalAiInsightsSectionProps) {
  return (
    <section
      aria-label="AI operational insights: staffing, demand, attendance proxy, and retention"
      className={cn("space-y-4", className)}
    >
      <OperationalAiPrivacyDisclosure
        privacy={insights.privacy}
        generatedAt={insights.generated_at}
        source={insights.source}
      />

      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        <OperationalAiInsightCardView
          category="staffing"
          insight={insights.staffing}
        />
        <OperationalAiInsightCardView
          category="busy_periods"
          insight={insights.busy_periods}
        />
        <OperationalAiInsightCardView
          category="no_shows"
          insight={insights.no_shows}
        />
        <OperationalAiInsightCardView
          category="retention"
          insight={insights.retention}
        />
      </div>
    </section>
  );
}
