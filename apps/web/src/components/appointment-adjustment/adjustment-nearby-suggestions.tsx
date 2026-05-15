import type { AppointmentAdjustmentSuggestion } from "@ozilcuts/types";
import { Button, EmptyState } from "@ozilcuts/ui";
import Link from "next/link";

import {
  formatAdjustmentWhen,
  formatSuggestionOffset,
} from "./format-adjustment";

type Props = {
  suggestions: AppointmentAdjustmentSuggestion[];
  acting: boolean;
  rescheduleHref: string;
  onPick: (startsAt: string) => void;
};

export function AdjustmentNearbySuggestions(props: Props) {
  const { suggestions, acting, rescheduleHref, onPick } = props;

  if (suggestions.length === 0) {
    return (
      <EmptyState
        title="No nearby openings"
        description="We couldn’t find alternate slots close to your time. Use full reschedule for the full calendar."
        action={
          <Button
            asChild
            variant="outline"
            size="sm"
            className="min-h-11 touch-manipulation"
          >
            <Link href={rescheduleHref}>Open full reschedule</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-2">
      <h3
        id="adjustment-nearby-heading"
        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        Nearby times · one tap
      </h3>
      <p className="sr-only">
        Horizontal list of suggested appointment start times. Tap a time to
        request a quick move without opening the full reschedule flow.
      </p>
      <div
        className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 pt-0.5 [scrollbar-width:thin] md:mx-0 md:grid md:snap-none md:grid-cols-2 md:overflow-visible md:p-0 lg:grid-cols-3"
        role="list"
        aria-labelledby="adjustment-nearby-heading"
      >
        {suggestions.map((s) => (
          <div key={s.starts_at} className="snap-start" role="listitem">
            <Button
              type="button"
              variant="secondary"
              disabled={acting}
              className="flex h-auto min-h-[3.25rem] w-[min(100%,11.5rem)] touch-manipulation flex-col items-stretch gap-0.5 px-3 py-2.5 text-left shadow-sm transition-[background-color,box-shadow] md:w-full"
              aria-label={`Request quick move to ${s.label}, ${formatSuggestionOffset(s.offset_minutes)} from current booking`}
              onClick={() => onPick(s.starts_at)}
            >
              <span className="text-sm font-semibold leading-tight text-foreground">
                {s.label}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {formatSuggestionOffset(s.offset_minutes)}
              </span>
              <span className="text-[11px] tabular-nums leading-snug text-muted-foreground/90">
                {formatAdjustmentWhen(s.starts_at)}
              </span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
