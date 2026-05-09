"use client";

import { OperationalLoadingBlock } from "@/components/operational-loading-block";
import { getStoredAuthToken } from "@/lib/auth-token";
import {
  ApiError,
  ApiValidationError,
  fetchManageBarberAvailability,
  replaceManageBarberAvailability,
} from "@ozilcuts/api";
import type { BarberAvailabilityDay } from "@ozilcuts/types";
import { BARBER_WEEKDAY_LABELS } from "@ozilcuts/types";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ozilcuts/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

type EditableRow = {
  key: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
};

function flattenDays(days: BarberAvailabilityDay[]): EditableRow[] {
  return days.flatMap((d) =>
    d.windows.map((w) => ({
      key: crypto.randomUUID(),
      weekday: d.weekday,
      starts_at: w.starts_at.length === 5 ? `${w.starts_at}:00` : w.starts_at,
      ends_at: w.ends_at.length === 5 ? `${w.ends_at}:00` : w.ends_at,
    })),
  );
}

function toApiTime(htmlTime: string): string {
  return htmlTime.length >= 5 ? htmlTime.slice(0, 5) : htmlTime;
}

export type ManageBarberHoursSectionProps = {
  userId: number;
  /** When true, keep “Add window” inside a collapsible block (barber focused workspace). */
  compactAddRemove: boolean;
};

export function ManageBarberHoursSection({
  userId,
  compactAddRemove,
}: ManageBarberHoursSectionProps) {
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [loadState, setLoadState] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      setLoadState("error");
      setLoadMessage("Sign in required.");

      return;
    }
    setLoadState("loading");
    setLoadMessage(null);
    try {
      const data = await fetchManageBarberAvailability(token, userId);
      setRows(flattenDays(data.weekdays));
      setLoadState("ok");
    } catch (e: unknown) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load.";
      setLoadState("error");
      setLoadMessage(message);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const windowsPayload = useMemo(
    () =>
      rows.map((r) => ({
        weekday: r.weekday,
        starts_at: toApiTime(r.starts_at),
        ends_at: toApiTime(r.ends_at),
      })),
    [rows],
  );

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const token = getStoredAuthToken();
    if (!token) return;
    setSaveBusy(true);
    setSaveError(null);
    try {
      const data = await replaceManageBarberAvailability(
        token,
        userId,
        windowsPayload,
      );
      setRows(flattenDays(data.weekdays));
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setSaveError(err.firstMessage() ?? "Validation failed.");
      } else {
        setSaveError("Could not save hours.");
      }
    } finally {
      setSaveBusy(false);
    }
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        weekday: 1,
        starts_at: "09:00:00",
        ends_at: "17:00:00",
      },
    ]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function updateRow(key: string, patch: Partial<EditableRow>) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Availability windows</CardTitle>
        <CardDescription>
          Add one or more intervals per day. Overlapping times on the same day
          are rejected.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loadState === "loading" || loadState === "idle" ? (
          <OperationalLoadingBlock label="Loading schedule" />
        ) : null}
        {loadState === "error" ? (
          <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-4">
            <p className="text-sm text-destructive">
              {loadMessage ?? "Error"}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={() => void load()}
            >
              Retry
            </Button>
          </div>
        ) : null}
        {loadState === "ok" ? (
          <form className="flex flex-col gap-6" onSubmit={onSave}>
            <ul className="flex flex-col gap-4">
              {rows.map((row) => (
                <li
                  key={row.key}
                  className="rounded-lg border border-border/60 p-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor={`d-${row.key}`}
                        className="text-sm font-medium leading-none"
                      >
                        Day
                      </label>
                      <select
                        id={`d-${row.key}`}
                        className="border-input bg-background text-foreground focus-visible:ring-ring/50 flex h-11 w-full rounded-lg border px-3 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:h-10 sm:text-sm"
                        value={row.weekday}
                        onChange={(ev) =>
                          updateRow(row.key, {
                            weekday: Number.parseInt(ev.target.value, 10),
                          })
                        }
                      >
                        {BARBER_WEEKDAY_LABELS.map((label, weekday) => (
                          <option key={label} value={weekday}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col justify-end sm:justify-start">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-11 w-full touch-manipulation sm:ml-auto sm:min-h-9 sm:w-auto"
                        onClick={() => removeRow(row.key)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor={`s-${row.key}`}
                        className="text-sm font-medium leading-none"
                      >
                        Opens
                      </label>
                      <input
                        id={`s-${row.key}`}
                        type="time"
                        step={60}
                        className="border-input bg-background text-foreground focus-visible:ring-ring/50 flex h-11 w-full rounded-lg border px-3 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:h-10 sm:text-sm"
                        value={row.starts_at.slice(0, 5)}
                        onChange={(ev) =>
                          updateRow(row.key, {
                            starts_at: `${ev.target.value}:00`,
                          })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor={`e-${row.key}`}
                        className="text-sm font-medium leading-none"
                      >
                        Closes
                      </label>
                      <input
                        id={`e-${row.key}`}
                        type="time"
                        step={60}
                        className="border-input bg-background text-foreground focus-visible:ring-ring/50 flex h-11 w-full rounded-lg border px-3 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:h-10 sm:text-sm"
                        value={row.ends_at.slice(0, 5)}
                        onChange={(ev) =>
                          updateRow(row.key, {
                            ends_at: `${ev.target.value}:00`,
                          })
                        }
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {compactAddRemove ? (
              <details className="rounded-xl border border-border/55 bg-muted/10 p-3 sm:p-4">
                <summary className="min-h-11 cursor-pointer list-none py-2 text-sm font-semibold text-foreground [-webkit-details-marker]:hidden [&::marker]:hidden">
                  <span className="underline-offset-4 hover:underline">
                    Add or remove time blocks
                  </span>
                </summary>
                <div className="mt-2 flex flex-wrap gap-2 border-t border-border/40 pt-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-11 touch-manipulation sm:min-h-9"
                    onClick={addRow}
                  >
                    Add window
                  </Button>
                </div>
              </details>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11 touch-manipulation sm:min-h-9"
                  onClick={addRow}
                >
                  Add window
                </Button>
              </div>
            )}
            {saveError ? (
              <p className="text-sm text-destructive" role="alert">
                {saveError}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={saveBusy}
              className="min-h-11 w-full touch-manipulation sm:w-auto sm:min-h-10"
            >
              {saveBusy ? "Saving…" : "Save schedule"}
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
