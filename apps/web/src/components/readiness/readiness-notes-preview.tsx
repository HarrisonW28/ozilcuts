"use client";

import { ReadinessSectionHeader } from "@/components/readiness/readiness-section-header";
import { formatHistoryWhen } from "@/lib/customer-recognition";
import {
  READINESS_MAX_NOTE_PREVIEW,
  READINESS_NOTE_BODY_CHARS,
  sortNotesForPreview,
  truncatePlain,
  type LoadSlice,
} from "@/lib/barber-readiness";
import type { CustomerNote } from "@ozilcuts/types";
import { StickyNote } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

type ReadinessNotesPreviewProps = {
  slice: LoadSlice<CustomerNote[]>;
  customerUserId?: number | null;
  confirmationBase: string;
};

export function ReadinessNotesPreview({
  slice,
  customerUserId,
  confirmationBase,
}: ReadinessNotesPreviewProps) {
  const href = `${confirmationBase}#memory-staff-notes`;
  const notePreview = useMemo(() => {
    if (slice.status !== "ok") return [];
    return sortNotesForPreview(slice.data).slice(0, READINESS_MAX_NOTE_PREVIEW);
  }, [slice]);

  const count =
    slice.status === "ok" && slice.data.length > 0 ? slice.data.length : undefined;

  return (
    <section className="readiness-section-block" aria-labelledby="readiness-notes">
      <h3 id="readiness-notes" className="sr-only">
        Staff notes preview
      </h3>
      <ReadinessSectionHeader
        icon={<StickyNote className="size-3.5" />}
        label="Staff notes"
        href={href}
        count={count}
      />
      {customerUserId == null || customerUserId < 1 ? (
        <p className="text-caption text-muted-foreground">
          Link a customer account on the booking to load saved staff notes here.
        </p>
      ) : slice.status === "error" ? (
        <p className="text-caption text-destructive">{slice.message}</p>
      ) : notePreview.length === 0 ? (
        <p className="text-caption text-muted-foreground">No staff notes yet.</p>
      ) : (
        <ul className="space-y-1">
          {notePreview.map((n) => (
            <li key={n.id}>
              <Link href={href} className="readiness-note-row">
                <p className="text-micro font-medium text-muted-foreground">
                  {n.pinned ? "Pinned · " : null}
                  {n.author?.name ? `${n.author.name} · ` : ""}
                  {formatHistoryWhen(n.updated_at ?? n.created_at)}
                </p>
                <p className="mt-1 line-clamp-2 text-sm leading-snug text-foreground">
                  {truncatePlain(n.body, READINESS_NOTE_BODY_CHARS)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
