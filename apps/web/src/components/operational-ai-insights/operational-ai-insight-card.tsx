"use client";

import type { OperationalAiInsightCard } from "@ozilcuts/types";
import {
  formatOperationalMetricValue,
  operationalInsightKeyLabel,
} from "@/lib/operational-ai-insights-display";
import { Card, CardContent, CardHeader, CardTitle, cn } from "@ozilcuts/ui";
import type { LucideIcon } from "lucide-react";
import { CalendarClock, TrendingUp, UserX, Users } from "lucide-react";

import {
  OperationalAiConfidenceBadge,
  OperationalAiConfidenceScreenReader,
} from "./operational-ai-confidence-badge";

const categoryStyles = {
  staffing: {
    icon: Users,
    accent:
      "border-l-teal-600/80 dark:border-l-teal-400/90 [&_.icon-wrap]:bg-teal-500/15 [&_.icon-wrap]:text-teal-800 dark:[&_.icon-wrap]:text-teal-100",
  },
  busy_periods: {
    icon: CalendarClock,
    accent:
      "border-l-violet-600/80 dark:border-l-violet-400/90 [&_.icon-wrap]:bg-violet-500/15 [&_.icon-wrap]:text-violet-900 dark:[&_.icon-wrap]:text-violet-100",
  },
  no_shows: {
    icon: UserX,
    accent:
      "border-l-amber-600/85 dark:border-l-amber-400/90 [&_.icon-wrap]:bg-amber-500/15 [&_.icon-wrap]:text-amber-950 dark:[&_.icon-wrap]:text-amber-50",
  },
  retention: {
    icon: TrendingUp,
    accent:
      "border-l-rose-600/80 dark:border-l-rose-400/90 [&_.icon-wrap]:bg-rose-500/12 [&_.icon-wrap]:text-rose-950 dark:[&_.icon-wrap]:text-rose-50",
  },
} as const;

export type OperationalInsightCategory = keyof typeof categoryStyles;

type OperationalAiInsightCardViewProps = {
  insight: OperationalAiInsightCard;
  category: OperationalInsightCategory;
  className?: string;
};

export function OperationalAiInsightCardView({
  insight,
  category,
  className,
}: OperationalAiInsightCardViewProps) {
  const meta = categoryStyles[category];
  const Icon: LucideIcon = meta.icon;
  const metricEntries =
    insight.metrics && Object.keys(insight.metrics).length > 0
      ? Object.entries(insight.metrics)
      : [];

  return (
    <Card
      size="sm"
      className={cn(
        "dashboard-surface h-full border-l-4 shadow-xs transition-shadow hover:shadow-sm",
        meta.accent,
        className,
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start gap-3">
          <div
            className="icon-wrap flex size-10 shrink-0 items-center justify-center rounded-xl"
            aria-hidden
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <CardTitle className="text-base leading-snug">{insight.title}</CardTitle>
              <OperationalAiConfidenceBadge confidence={insight.confidence} />
            </div>
            <OperationalAiConfidenceScreenReader confidence={insight.confidence} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <p className="text-sm leading-relaxed text-muted-foreground">{insight.summary}</p>
        {metricEntries.length > 0 ? (
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {metricEntries.map(([k, v]) => (
              <div
                key={k}
                className="flex flex-col gap-0.5 rounded-lg border border-border/40 bg-background/60 px-3 py-2 dark:border-border/35 dark:bg-background/40"
              >
                <dt className="text-micro font-medium text-muted-foreground">
                  {operationalInsightKeyLabel(k)}
                </dt>
                <dd className="font-semibold tabular-nums text-foreground">
                  {formatOperationalMetricValue(k, v)}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        <div>
          <p
            id={`ops-ai-actions-${category}`}
            className="mb-2 text-micro font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Recommended actions
          </p>
          <ol
            className="list-none space-y-2.5"
            aria-labelledby={`ops-ai-actions-${category}`}
          >
            {insight.actions.map((a, i) => (
              <li key={`${i}-${a.slice(0, 24)}`} className="flex gap-3">
                <span
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-micro font-bold text-primary dark:bg-primary/20"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span className="min-w-0 text-sm leading-relaxed text-foreground">
                  {a}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
