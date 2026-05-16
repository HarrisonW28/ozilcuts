"use client";

import { fetchVisitThreadAssist } from "@ozilcuts/api";
import type { VisitThreadAssistPayload } from "@ozilcuts/types";
import { Button, Skeleton } from "@ozilcuts/ui";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

type VisitThreadWritingAssistProps = {
  appointmentId: number;
  token: string;
  /** Fetched only when true (arrival window + can send). */
  enabled: boolean;
  onPickSuggestion: (text: string) => void;
};

export function VisitThreadWritingAssist({
  appointmentId,
  token,
  enabled,
  onPickSuggestion,
}: VisitThreadWritingAssistProps) {
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ok"; data: VisitThreadAssistPayload }
    | { kind: "error"; message: string }
  >({ kind: enabled ? "loading" : "idle" });

  useEffect(() => {
    if (!enabled) {
      setState({ kind: "idle" });
      return;
    }
    let cancelled = false;
    setState({ kind: "loading" });
    fetchVisitThreadAssist(token, appointmentId)
      .then((data) => {
        if (!cancelled) setState({ kind: "ok", data });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setState({
            kind: "error",
            message:
              e instanceof Error ? e.message : "Could not load suggestions.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, token, appointmentId]);

  if (!enabled) return null;

  /** `enabled` can turn true before the effect sets `loading` (prior mount had `idle`). */
  if (state.kind === "loading" || state.kind === "idle") {
    return (
      <div
        className="space-y-2 rounded-lg border border-border/40 bg-background/50 px-3 py-3 dark:bg-background/40"
        aria-busy="true"
        aria-label="Loading wording ideas"
      >
        <Skeleton className="h-4 w-44 rounded-md" />
        <Skeleton className="h-9 w-full max-w-md rounded-lg" />
        <Skeleton className="h-9 w-full max-w-sm rounded-lg" />
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <p className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="alert">
        {state.message}
      </p>
    );
  }

  const { delay_prompt, suggested_notes, optional_status_line, privacy, source } =
    state.data;
  const hasContent =
    Boolean(delay_prompt) ||
    suggested_notes.length > 0 ||
    Boolean(optional_status_line);

  if (!hasContent) return null;

  return (
    <details className="rounded-xl border border-border/45 bg-gradient-to-b from-primary/[0.05] to-transparent dark:from-primary/[0.08]">
      <summary
        className={[
          "flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium outline-none transition-colors",
          "marker:content-none [&::-webkit-details-marker]:hidden",
          "focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-offset-background",
        ].join(" ")}
      >
        <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1 text-left leading-snug">
          Calm wording ideas{" "}
          <span className="font-normal text-muted-foreground">
            (optional · tap to reuse, edit before sending)
          </span>
        </span>
        <span className="sr-only">
          {source === "model" ? "Includes refined phrasing" : "Rule-based ideas"}
        </span>
      </summary>
      <div className="space-y-3 border-t border-border/35 px-3 pb-3 pt-3 dark:border-border/30">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {privacy.staff_only}
          {privacy.third_party ? (
            <>
              {" "}
              <span className="italic">{privacy.third_party}</span>
            </>
          ) : null}
        </p>

        {delay_prompt ? (
          <div
            className="rounded-lg border border-teal-500/25 bg-teal-500/[0.06] px-3 py-2 text-xs leading-relaxed text-foreground dark:bg-teal-500/[0.09]"
            role="status"
          >
            <span className="font-semibold text-teal-900 dark:text-teal-100">
              Timing nudge ·{" "}
            </span>
            {delay_prompt}
          </div>
        ) : null}

        {suggested_notes.length > 0 ? (
          <div className="space-y-2">
            <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
              Suggested lines
            </p>
            <ul className="flex flex-col gap-2">
              {suggested_notes.map((line: string) => (
                <li key={line}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto min-h-11 w-full touch-manipulation whitespace-normal px-3 py-2 text-left text-xs font-normal leading-snug sm:min-h-10 sm:text-sm"
                    aria-label={`Use as custom note: ${line}`}
                    onClick={() => onPickSuggestion(line)}
                  >
                    {line}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {optional_status_line &&
        !suggested_notes.includes(optional_status_line) ? (
          <div className="space-y-1">
            <p className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
              Status snapshot
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-auto min-h-10 w-full touch-manipulation whitespace-normal px-3 py-2 text-left text-xs font-normal leading-snug"
              onClick={() => onPickSuggestion(optional_status_line)}
            >
              {optional_status_line}
            </Button>
          </div>
        ) : null}
      </div>
    </details>
  );
}
