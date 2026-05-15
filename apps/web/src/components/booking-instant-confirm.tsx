"use client";

import { formatGbp } from "@/lib/format-gbp";
import type { BarberProfilePublic, ServiceSummary } from "@ozilcuts/types";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ozilcuts/ui";

function formatIsoDate(date: string): string {
  const [y, m, d] = date.split("-").map((s) => Number.parseInt(s, 10));
  if (!y || !m || !d) return date;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTimeFromIso(iso: string): string {
  const [, time] = iso.split("T");
  return (time ?? "").slice(0, 5);
}

type BookingInstantConfirmProps = {
  service: ServiceSummary;
  barber: BarberProfilePublic;
  date: string;
  selectedSlot: string;
  bookBusy: boolean;
  showDeposit: boolean;
  formId: string;
  onEditDetails: () => void;
};

/**
 * One-screen confirm for returning customers — reduces booking to a single tap
 * after shortcuts or remembered preferences fill the form.
 */
export function BookingInstantConfirm({
  service,
  barber,
  date,
  selectedSlot,
  bookBusy,
  showDeposit,
  formId,
  onEditDetails,
}: BookingInstantConfirmProps) {
  return (
    <Card className="border-primary/40 bg-gradient-to-b from-primary/[0.08] to-card shadow-md dark:border-primary/30 dark:from-primary/[0.1]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg tracking-tight sm:text-xl">
          Ready to confirm
        </CardTitle>
        <CardDescription>
          Your usual picks are set — tap confirm or adjust below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="dashboard-surface rounded-xl p-4 text-sm">
          <p className="font-semibold leading-snug text-foreground">
            {service.name}
            <span className="font-normal text-muted-foreground"> with </span>
            {barber.barber.name}
          </p>
          <p className="mt-1.5 tabular-nums text-muted-foreground">
            {formatIsoDate(date)} · {formatTimeFromIso(selectedSlot)} ·{" "}
            {service.duration_minutes} min · {formatGbp(service.price_cents)}
          </p>
          {showDeposit && service.deposit_cents > 0 ? (
            <p className="mt-2 text-muted-foreground">
              Deposit due now{" "}
              <span className="font-semibold text-foreground">
                {formatGbp(service.deposit_cents)}
              </span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="submit"
            form={formId}
            pending={bookBusy}
            className="min-h-12 w-full touch-manipulation text-base font-semibold sm:min-h-11 sm:flex-1"
          >
            {bookBusy ? "Booking…" : "Confirm booking"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full touch-manipulation sm:w-auto"
            onClick={onEditDetails}
          >
            Change details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
