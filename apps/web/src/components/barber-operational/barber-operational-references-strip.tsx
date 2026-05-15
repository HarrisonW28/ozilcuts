"use client";

import { BarberOperationalSection } from "@/components/barber-operational/barber-operational-section";
import type { ReferencePreview } from "@/lib/barber-operational-home";
import { formatStartTime } from "@/lib/barber-operational-home";
import { EmptyState } from "@ozilcuts/ui";
import { Scissors } from "lucide-react";
import Link from "next/link";

type BarberOperationalReferencesStripProps = {
  references: ReferencePreview[];
};

export function BarberOperationalReferencesStrip({
  references,
}: BarberOperationalReferencesStripProps) {
  return (
    <BarberOperationalSection
      id="barber-refs-heading"
      title="Haircut references"
      badge={
        references.length > 0 ? (
          <span className="text-xs tabular-nums text-muted-foreground">
            {references.length} loaded
          </span>
        ) : undefined
      }
    >
      {references.length === 0 ? (
        <EmptyState
          title="No reference photos yet"
          description="Hair profile photos appear here when guests add them before the visit."
          className="rounded-2xl border border-dashed border-border/60 bg-muted/10 py-8"
        />
      ) : (
        <div
          className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pt-1 [scrollbar-width:thin] sm:mx-0 sm:grid sm:snap-none sm:grid-cols-4 sm:gap-3 sm:overflow-visible"
          role="list"
          aria-label="Haircut reference previews"
        >
          {references.map((ref) => (
            <Link
              key={ref.appointmentId}
              href={`/appointments/${ref.appointmentId}/confirmation`}
              role="listitem"
              className="snap-center shrink-0 motion-safe:active:scale-[0.98] sm:snap-none"
            >
              <div className="w-[7.5rem] overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm sm:w-full">
                <div className="relative aspect-[3/4] bg-muted/20">
                  {ref.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ref.photoUrl}
                      alt={`${ref.customerName} reference`}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <Scissors className="size-6 opacity-40" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="space-y-0.5 border-t border-border/40 px-2.5 py-2">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {ref.customerName}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {ref.serviceName}
                    {ref.startsAt
                      ? ` · ${formatStartTime(ref.startsAt)}`
                      : ""}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </BarberOperationalSection>
  );
}
