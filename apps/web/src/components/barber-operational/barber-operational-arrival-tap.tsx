"use client";

import {
  arrivalActionLabel,
  nextArrivalState,
} from "@/lib/barber-operational-home";
import type {
  AppointmentArrivalState,
  AppointmentRecord,
} from "@ozilcuts/types";
import { Button, cn } from "@ozilcuts/ui";
import { Armchair, MapPin, Sofa } from "lucide-react";

type BarberOperationalArrivalTapProps = {
  row: AppointmentRecord;
  pending: boolean;
  onAdvance: (
    row: AppointmentRecord,
    next: AppointmentArrivalState,
  ) => void | Promise<void>;
  className?: string;
  fullWidth?: boolean;
};

export function BarberOperationalArrivalTap({
  row,
  pending,
  onAdvance,
  className,
  fullWidth = false,
}: BarberOperationalArrivalTapProps) {
  const next = nextArrivalState(row.arrival_state);
  const label = arrivalActionLabel(row.arrival_state);
  if (!next || !label) return null;

  const Icon =
    row.arrival_state === "expected"
      ? MapPin
      : row.arrival_state === "waiting"
        ? Armchair
        : Sofa;

  return (
    <Button
      type="button"
      size="lg"
      className={cn(
        "min-h-12 touch-manipulation sm:min-h-11",
        fullWidth && "w-full",
        className,
      )}
      pending={pending}
      onClick={() => void onAdvance(row, next)}
    >
      <Icon className="mr-2 size-4 shrink-0" aria-hidden />
      {pending ? "Updating…" : label}
    </Button>
  );
}
