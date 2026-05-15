"use client";

import {
  arrivalHospitalityHeadline,
  arrivalHospitalitySubline,
  arrivalStateLabel,
} from "@/lib/appointment-arrival";
import type { AppointmentArrivalState } from "@ozilcuts/types";
import { cn } from "@ozilcuts/ui";
import { Radio, Sparkles } from "lucide-react";

type CheckInStatusHeroProps = {
  state: AppointmentArrivalState;
  mode: "customer" | "staff";
  windowOpen: boolean;
  barberName?: string | null;
  headingId: string;
};

export function CheckInStatusHero({
  state,
  mode,
  windowOpen,
  barberName,
  headingId,
}: CheckInStatusHeroProps) {
  return (
    <header
      className={cn(
        "check-in-hero",
        state === "expected" && "check-in-hero--expected",
        state === "arrived" && "check-in-hero--arrived",
        state === "waiting" && "check-in-hero--waiting",
        state === "in_chair" && "check-in-hero--in_chair",
      )}
    >
      <div className="check-in-hero-glow" aria-hidden />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <p className="text-caption font-semibold uppercase tracking-widecaps text-muted-foreground">
            {mode === "staff" ? "Guest arrival" : "Your visit"}
          </p>
          <h2
            id={headingId}
            className="text-balance text-title-lg font-semibold tracking-editorial text-foreground sm:text-2xl"
          >
            {arrivalHospitalityHeadline(state, mode)}
          </h2>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base">
            {arrivalHospitalitySubline(state, mode, barberName)}
          </p>
          <p className="sr-only">Status: {arrivalStateLabel(state)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {windowOpen ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/35 bg-sky-500/10 px-2.5 py-1 text-micro font-semibold uppercase tracking-widecaps text-sky-900 dark:text-sky-100"
              title="This page refreshes while it stays open."
            >
              <Radio
                className="size-3 motion-safe:animate-pulse"
                aria-hidden
              />
              Live
            </span>
          ) : null}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-micro font-semibold uppercase tracking-widecaps",
              windowOpen
                ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                : "border-border/60 bg-muted/30 text-muted-foreground",
            )}
          >
            <Sparkles className="size-3.5 opacity-80" aria-hidden />
            {windowOpen ? "Check-in open" : "Check-in closed"}
          </span>
        </div>
      </div>
    </header>
  );
}
