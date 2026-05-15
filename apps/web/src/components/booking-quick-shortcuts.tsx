"use client";

import type { RememberedBookingChoice } from "@/lib/booking-remembered-preferences";
import type { BarberProfilePublic, RebookSuggestion } from "@ozilcuts/types";
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

type BookingQuickShortcutsProps = {
  nextVisit: RebookSuggestion | null;
  preferredBarber: BarberProfilePublic | null;
  rememberedChoice: RememberedBookingChoice | null;
  onApplyNextVisit: (suggestion: RebookSuggestion) => void;
  onApplyPreferredBarber: (barberUserId: number) => void;
  onApplyRememberedWithBarber: (barberUserId: number) => void;
};

/**
 * Quick rebook + favourite barber shortcuts — one tap into a pre-filled booking flow.
 */
export function BookingQuickShortcuts({
  nextVisit,
  preferredBarber,
  rememberedChoice,
  onApplyNextVisit,
  onApplyPreferredBarber,
  onApplyRememberedWithBarber,
}: BookingQuickShortcutsProps) {
  if (!nextVisit && !preferredBarber) return null;

  return (
    <Card className="border-primary/35 bg-primary/5 shadow-sm dark:border-primary/30">
      <CardHeader className="space-y-1 pb-3">
        <CardTitle className="text-lg tracking-tight sm:text-xl">
          Quick rebook
        </CardTitle>
        <CardDescription>
          Jump back into your usual flow — we&apos;ll pick the best open time for
          you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {nextVisit ? (
          <div className="dashboard-surface motion-card rounded-xl p-4">
            <p className="font-semibold text-foreground">Repeat your last cut</p>
            <p className="mt-1.5 leading-relaxed text-muted-foreground">
              {nextVisit.service?.name ?? "Your service"}
              {nextVisit.barber ? ` with ${nextVisit.barber.name}` : ""}
              {" · suggested "}
              {formatIsoDate(nextVisit.suggested_date)}
            </p>
            {nextVisit.sample_size >= 2 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Based on {nextVisit.sample_size} past visits with this barber —
                suggested times appear first below.
              </p>
            ) : null}
            <Button
              type="button"
              size="sm"
              className="mt-4 min-h-11 touch-manipulation sm:min-h-10"
              onClick={() => onApplyNextVisit(nextVisit)}
            >
              Use this cut
            </Button>
          </div>
        ) : null}

        {preferredBarber ? (
          <div className="dashboard-surface motion-card rounded-xl p-4">
            <p className="font-semibold text-foreground">Favourite barber</p>
            <p className="mt-1.5 leading-relaxed text-muted-foreground">
              Start with {preferredBarber.barber.name}
              {preferredBarber.title ? ` · ${preferredBarber.title}` : ""}.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-4 min-h-11 touch-manipulation sm:min-h-10"
              onClick={() => onApplyPreferredBarber(preferredBarber.barber.id)}
            >
              Book with {preferredBarber.barber.name.split(" ")[0]}
            </Button>
            {rememberedChoice?.barberId === preferredBarber.barber.id ? (
              <Button
                type="button"
                size="sm"
                className="mt-2 min-h-11 touch-manipulation sm:min-h-10"
                onClick={() =>
                  onApplyRememberedWithBarber(preferredBarber.barber.id)
                }
              >
                Use my usual service & date
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
