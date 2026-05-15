"use client";

import { arrivalStateLabel } from "@/lib/appointment-arrival";
import { isArrivalStateAdvance } from "@/lib/check-in-flow";
import type { AppointmentArrivalState } from "@ozilcuts/types";
import { useEffect, useRef, useState } from "react";

type CheckInStateAnnouncerProps = {
  state: AppointmentArrivalState;
};

/** Screen-reader announcement when visit status advances. */
export function CheckInStateAnnouncer({ state }: CheckInStateAnnouncerProps) {
  const prevRef = useRef<AppointmentArrivalState>(state);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev !== state && isArrivalStateAdvance(prev, state)) {
      setAnnouncement(`Visit status updated to ${arrivalStateLabel(state)}.`);
    }
    prevRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!announcement) return;
    const t = window.setTimeout(() => setAnnouncement(null), 4_000);
    return () => window.clearTimeout(t);
  }, [announcement]);

  if (!announcement) return null;

  return (
    <p className="sr-only" role="status" aria-live="assertive" aria-atomic="true">
      {announcement}
    </p>
  );
}
