"use client";

import type { AppointmentThreadMeta } from "@ozilcuts/types";
import {
  VISIT_THREAD_GUEST_OPERATIONAL_LABELS,
  VISIT_THREAD_GUEST_PRESET_LABELS,
  VISIT_THREAD_SHOP_OPERATIONAL_LABELS,
  VISIT_THREAD_SHOP_PRESET_LABELS,
} from "@/lib/visit-thread-labels";
import { Button, Label } from "@ozilcuts/ui";
import { useRef, useState } from "react";

import { VisitThreadOperationalQuickReplies } from "./visit-thread-operational-quick-replies";
import { VisitThreadWritingAssist } from "./visit-thread-writing-assist";

type VisitThreadComposerProps = {
  appointmentId: number;
  meta: AppointmentThreadMeta;
  isShopSide: boolean;
  sending: boolean;
  /** When set, optional wording assist loads in the arrival window. */
  authToken?: string | null;
  onSendOperational: (key: string) => void;
  onSendPreset: (key: string) => void;
  onSendNote: (body: string) => Promise<void>;
};

export function VisitThreadComposer({
  appointmentId,
  meta,
  isShopSide,
  sending,
  authToken = null,
  onSendOperational,
  onSendPreset,
  onSendNote,
}: VisitThreadComposerProps) {
  const [noteDraft, setNoteDraft] = useState("");
  const noteDetailsRef = useRef<HTMLDetailsElement>(null);

  const chipMap = isShopSide
    ? VISIT_THREAD_SHOP_OPERATIONAL_LABELS
    : VISIT_THREAD_GUEST_OPERATIONAL_LABELS;
  const presetLabelMap = isShopSide
    ? VISIT_THREAD_SHOP_PRESET_LABELS
    : VISIT_THREAD_GUEST_PRESET_LABELS;

  const assistEnabled =
    Boolean(authToken) &&
    meta.in_arrival_messaging_window &&
    meta.can_send;

  const applyAssistLine = (text: string) => {
    setNoteDraft(text);
    if (noteDetailsRef.current) {
      noteDetailsRef.current.open = true;
    }
    requestAnimationFrame(() => {
      document.getElementById(`visit-thread-note-${appointmentId}`)?.focus();
    });
  };

  if (!meta.can_send) return null;

  return (
    <section
      aria-label="Send a quick reply for this visit"
      className="space-y-4 rounded-xl border border-border/45 bg-muted/10 p-3 dark:bg-muted/15 sm:p-4"
    >
      <VisitThreadOperationalQuickReplies
        operationalKeys={meta.operational_keys}
        labelMap={chipMap}
        isShopSide={isShopSide}
        inArrivalMessagingWindow={meta.in_arrival_messaging_window}
        sending={sending}
        onSendOperational={onSendOperational}
      />

      {authToken ? (
        <VisitThreadWritingAssist
          appointmentId={appointmentId}
          token={authToken}
          enabled={assistEnabled}
          onPickSuggestion={applyAssistLine}
        />
      ) : null}

      {meta.preset_keys.length > 0 ? (
        <fieldset className="min-w-0 space-y-2 border-0 border-t border-border/40 pt-4 dark:border-border/35">
          <legend className="mb-2 w-full text-micro font-semibold uppercase tracking-wide text-muted-foreground">
            Preset responses
          </legend>
          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-3">
            {meta.preset_keys.map((key) => (
              <Button
                key={key}
                type="button"
                variant="outline"
                disabled={sending}
                className="min-h-12 shrink-0 basis-[min(100%,10.5rem)] snap-center touch-manipulation justify-center px-2 text-center text-xs font-semibold leading-snug sm:min-h-11 sm:basis-auto sm:text-sm"
                aria-label={presetLabelMap[key] ?? key}
                onClick={() => onSendPreset(key)}
              >
                {presetLabelMap[key] ?? key}
              </Button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <details
        ref={noteDetailsRef}
        className="rounded-lg border border-border/50 bg-background/60 dark:bg-background/40"
      >
        <summary
          className={[
            "min-h-11 cursor-pointer list-none px-3 py-2.5 text-sm font-medium outline-none transition-colors",
            "marker:content-none [&::-webkit-details-marker]:hidden",
            "focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-offset-background",
          ].join(" ")}
        >
          Custom note (optional)
        </summary>
        <div className="space-y-3 border-t border-border/40 px-3 pb-3 pt-3 dark:border-border/35">
          <Label
            className="text-xs font-medium text-muted-foreground"
            htmlFor={`visit-thread-note-${appointmentId}`}
          >
            Only for this booking — keep it brief and practical.
          </Label>
          <textarea
            id={`visit-thread-note-${appointmentId}`}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="e.g. Which entrance should I use?"
            maxLength={1000}
            rows={3}
            className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 flex min-h-[5.5rem] w-full resize-y rounded-lg border px-3 py-2 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:text-sm"
            disabled={sending}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              pending={sending}
              disabled={!noteDraft.trim()}
              className="min-h-11 touch-manipulation sm:min-h-9"
              onClick={() => {
                void (async () => {
                  const b = noteDraft.trim();
                  if (!b) return;
                  await onSendNote(b);
                  setNoteDraft("");
                })();
              }}
            >
              Add to thread
            </Button>
          </div>
        </div>
      </details>
    </section>
  );
}
