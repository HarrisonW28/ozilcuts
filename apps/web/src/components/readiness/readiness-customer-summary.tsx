"use client";

import {
  CustomerSummaryEmptyState,
  CustomerSummaryErrorBanner,
  CustomerSummaryPrivacyDisclosure,
  CustomerSummarySectionCard,
  CustomerSummarySkeletonCompact,
  CustomerSummarySkeletonExpanded,
  CustomerSummarySourceBadge,
} from "@/components/customer-summary";
import {
  aiSummaryHasContent,
  readinessSummaryDigest,
  type LoadSlice,
} from "@/lib/barber-readiness";
import type { AppointmentCustomerAiSummaryResponse } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";
import { Activity, Brain, CalendarDays, NotebookPen, Scissors } from "lucide-react";
import Link from "next/link";

type ReadinessCustomerSummaryProps = {
  slice: LoadSlice<AppointmentCustomerAiSummaryResponse>;
  confirmationHref: string;
  variant?: "compact" | "expanded";
  /** Refetch summary after a failed load (chair prep + confirmation). */
  onRetry?: () => void;
  className?: string;
};

function formatGeneratedLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ReadinessCustomerSummary({
  slice,
  confirmationHref,
  variant = "compact",
  onRetry,
  className,
}: ReadinessCustomerSummaryProps) {
  if (slice.status === "idle") {
    return variant === "compact" ? (
      <CustomerSummarySkeletonCompact className={className} />
    ) : (
      <CustomerSummarySkeletonExpanded className={className} />
    );
  }

  if (slice.status === "loading") {
    return variant === "compact" ? (
      <CustomerSummarySkeletonCompact className={className} />
    ) : (
      <CustomerSummarySkeletonExpanded className={className} />
    );
  }

  if (slice.status === "error") {
    return (
      <CustomerSummaryErrorBanner
        message={slice.message}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  const data = slice.data;
  const digest = readinessSummaryDigest(data);
  const hasAny = aiSummaryHasContent(data);
  const generatedLabel = formatGeneratedLabel(data.generated_at);

  if (variant === "compact") {
    return (
      <section
        className={cn("customer-summary-readiness-compact space-y-3", className)}
        aria-labelledby="readiness-summary-heading"
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          <h2
            id="readiness-summary-heading"
            className="flex min-w-0 flex-wrap items-center gap-2 text-micro font-semibold uppercase tracking-wide text-muted-foreground"
          >
            <Brain
              className="size-3.5 shrink-0 text-violet-600 dark:text-violet-300"
              aria-hidden
            />
            <span className="min-w-0">Customer summary</span>
            <CustomerSummarySourceBadge source={data.source} />
          </h2>
          <Link
            href={confirmationHref}
            className="ms-auto flex min-h-11 items-center rounded-md px-2 text-caption font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-9 dark:focus-visible:ring-offset-background"
          >
            Full brief
          </Link>
        </div>
        {!hasAny ? (
          <CustomerSummaryEmptyState
            linkedCustomer={data.linked_customer}
            variant="compact"
          />
        ) : digest ? (
          <p className="text-sm leading-relaxed text-foreground">{digest}</p>
        ) : null}
        <p className="text-[0.6875rem] leading-relaxed text-muted-foreground">
          Staff-only — same privacy rules as barber insights.
        </p>
      </section>
    );
  }

  const { sections } = data;

  return (
    <section
      className={cn(
        "customer-summary-readiness-expanded rounded-2xl border border-violet-500/20 bg-violet-500/[0.03] p-4 sm:p-5 dark:border-violet-400/15 dark:bg-violet-500/[0.05]",
        className,
      )}
      aria-labelledby="customer-ai-summary-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="customer-ai-summary-title"
            className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-foreground"
          >
            <Brain
              className="size-5 shrink-0 text-violet-600 dark:text-violet-300"
              aria-hidden
            />
            <span>Customer summary</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.linked_customer
              ? "Haircut preferences, visit summaries, barber notes digest, and operational insights for this visit."
              : "Operational insights for this booking. Link a customer for the full four-part brief."}
          </p>
          {generatedLabel ? (
            <p className="mt-2 text-caption text-muted-foreground">
              Generated{" "}
              <time dateTime={data.generated_at ?? undefined}>{generatedLabel}</time>
            </p>
          ) : null}
        </div>
        <CustomerSummarySourceBadge
          source={data.source}
          className="px-3 py-1 text-micro normal-case tracking-normal sm:uppercase"
        />
      </div>

      {!hasAny ? (
        <div className="mt-5">
          <CustomerSummaryEmptyState
            linkedCustomer={data.linked_customer}
            variant="expanded"
          />
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {sections.hair_preferences ? (
            <CustomerSummarySectionCard
              title="Haircut preferences"
              body={sections.hair_preferences}
              icon={Scissors}
            />
          ) : null}
          {sections.visit_summary ? (
            <CustomerSummarySectionCard
              title="Visit summary"
              body={sections.visit_summary}
              icon={CalendarDays}
            />
          ) : null}
          {sections.notes_digest ? (
            <CustomerSummarySectionCard
              title="Barber notes digest"
              body={sections.notes_digest}
              icon={NotebookPen}
            />
          ) : null}
          {sections.operational_signals ? (
            <CustomerSummarySectionCard
              title="Operational insights"
              body={sections.operational_signals}
              icon={Activity}
            />
          ) : null}
        </div>
      )}

      <div className="mt-5">
        <CustomerSummaryPrivacyDisclosure
          staffOnly={data.privacy.staff_only}
          thirdParty={data.privacy.third_party}
        />
      </div>
    </section>
  );
}
