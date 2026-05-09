"use client";

import { getStoredAuthToken } from "@/lib/auth-token";
import {
  ApiError,
  ApiValidationError,
  createWalkInAppointment,
  fetchBarberSlots,
  fetchServices,
} from "@ozilcuts/api";
import type { ServiceSummary } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
} from "@ozilcuts/ui";
import { useCallback, useEffect, useState } from "react";

function formatSlotLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

type BarberWalkInPanelProps = {
  barberUserId: number;
  /** Focused calendar day (YYYY-MM-DD) */
  focusedDateYmd: string;
  onBooked: () => void;
};

export function BarberWalkInPanel({
  barberUserId,
  focusedDateYmd,
  onBooked,
}: BarberWalkInPanelProps) {
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [walkInName, setWalkInName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchServices()
      .then((data) => {
        if (cancelled) return;
        setServices(data);
        setServiceId((prev) => prev ?? (data[0]?.id ?? null));
      })
      .catch(() => {
        if (cancelled) return;
        setServices([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadSlots = useCallback(async () => {
    if (barberUserId < 1 || serviceId === null) return;
    setSlotsLoading(true);
    setError(null);
    setSelectedSlot(null);
    try {
      const payload = await fetchBarberSlots(
        barberUserId,
        serviceId,
        focusedDateYmd,
      );
      setSlots(payload.slots);
    } catch (e: unknown) {
      setSlots([]);
      if (e instanceof ApiError) {
        setError(e.message);
      }
    } finally {
      setSlotsLoading(false);
    }
  }, [barberUserId, serviceId, focusedDateYmd]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getStoredAuthToken();
    if (!token || serviceId === null || selectedSlot === null) {
      setError("Pick a service and time.");
      return;
    }
    setBusy(true);
    setError(null);
    setDoneMsg(null);
    try {
      await createWalkInAppointment(token, {
        barber_user_id: barberUserId,
        service_id: serviceId,
        starts_at: selectedSlot,
        walk_in_name: walkInName.trim() === "" ? null : walkInName.trim(),
      });
      setDoneMsg("Walk-in saved — calendar refreshed.");
      setWalkInName("");
      setSelectedSlot(null);
      onBooked();
      void loadSlots();
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setError(err.firstMessage() ?? "Could not book walk-in.");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong.");
      }
    } finally {
      setBusy(false);
    }
  }

  function pickFirstSlot() {
    if (slots.length > 0) {
      setSelectedSlot(slots[0] ?? null);
    }
  }

  if (barberUserId < 1) {
    return null;
  }

  return (
    <Card
      id="barber-walk-in"
      className="scroll-mt-4 border-amber-500/30 bg-gradient-to-br from-amber-500/[0.07] to-transparent shadow-sm dark:border-amber-500/25 dark:from-amber-500/[0.09]"
    >
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-lg tracking-tight">Walk-in mode</CardTitle>
        <CardDescription className="text-pretty leading-relaxed">
          Block your chair for someone at the door — no online deposit, settles
          at the front. Uses the day you have selected above.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="walk-in-service">Service</Label>
            <select
              id="walk-in-service"
              className="flex min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-10 sm:text-sm"
              value={serviceId ?? ""}
              onChange={(ev) => {
                const v = Number.parseInt(ev.target.value, 10);
                setServiceId(Number.isFinite(v) ? v : null);
              }}
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.duration_minutes} min
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="walk-in-name">Guest first name (optional)</Label>
            <input
              id="walk-in-name"
              type="text"
              autoComplete="name"
              placeholder="e.g. Alex"
              maxLength={120}
              className="flex min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-10 sm:text-sm"
              value={walkInName}
              onChange={(e) => setWalkInName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <Label htmlFor="walk-in-slot" className="mb-0">
                Start time · {focusedDateYmd}
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-10 touch-manipulation"
                disabled={slotsLoading || slots.length === 0}
                onClick={pickFirstSlot}
              >
                Next open slot
              </Button>
            </div>
            {slotsLoading ? (
              <p className="text-sm text-muted-foreground" role="status">
                Loading open times…
              </p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open slots this day for that service — pick another day or
                adjust hours.
              </p>
            ) : (
              <select
                id="walk-in-slot"
                className="flex min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-10 sm:text-sm"
                value={selectedSlot ?? ""}
                onChange={(ev) =>
                  setSelectedSlot(ev.target.value === "" ? null : ev.target.value)
                }
              >
                <option value="">Select a time</option>
                {slots.map((iso) => (
                  <option key={iso} value={iso}>
                    {formatSlotLabel(iso)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {doneMsg ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">
              {doneMsg}
            </p>
          ) : null}

          <Button
            type="submit"
            className="min-h-11 w-full touch-manipulation sm:w-auto sm:min-h-10"
            disabled={
              busy || serviceId === null || selectedSlot === null || slotsLoading
            }
          >
            {busy ? "Saving…" : "Book walk-in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
