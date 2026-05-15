"use client";

import { ArrivalFlowStrip } from "@/components/arrival-flow-strip";
import { CustomerHomeSection } from "@/components/customer-home/customer-home-section";
import { VisitLiveStatusPanel } from "@/components/operational";
import { OperationalStatusChip } from "@/components/operational-status-chip";
import { deriveOperationalStatus } from "@/lib/shop-live-status";
import {
  arrivalStateLabel,
  isAppointmentArrivalWindowOpen,
} from "@/lib/appointment-arrival";
import {
  formatUpcomingDay,
  formatUpcomingTime,
} from "@/lib/customer-home";
import { formatGbp } from "@/lib/format-gbp";
import type { AppointmentRecord } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cn,
} from "@ozilcuts/ui";
import { CalendarClock, MapPin } from "lucide-react";
import Link from "next/link";

type CustomerHomeUpcomingProps = {
  upcoming: AppointmentRecord | null;
};

export function CustomerHomeUpcoming({ upcoming }: CustomerHomeUpcomingProps) {
  const showArrival =
    upcoming !== null && isAppointmentArrivalWindowOpen(upcoming);
  const nowMs = Date.now();
  const opStatus =
    upcoming !== null ? deriveOperationalStatus(upcoming, nowMs) : null;

  return (
    <CustomerHomeSection id="home-upcoming-heading" title="Upcoming">
      {upcoming ? (
        <Card className="brand-gradient-hero customer-home-hero overflow-hidden border-primary/40 shadow-md dark:border-primary/30">
          <CardHeader className="space-y-4 pb-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-micro font-semibold uppercase tracking-wide text-primary">
                  Next visit
                </p>
                <CardTitle className="text-2xl font-semibold leading-tight tracking-tight sm:text-[1.65rem]">
                  {upcoming.service?.name ?? "Appointment"}
                </CardTitle>
              </div>
              <div
                className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-right tabular-nums dark:bg-primary/15"
                aria-label={`Scheduled for ${formatUpcomingDay(upcoming.starts_at)} at ${formatUpcomingTime(upcoming.starts_at)}`}
              >
                <p className="text-xs font-medium text-foreground/90">
                  {formatUpcomingDay(upcoming.starts_at)}
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {formatUpcomingTime(upcoming.starts_at)}
                </p>
              </div>
            </div>
            <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground/85">
              {upcoming.barber ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-medium text-foreground">
                    {upcoming.barber.name}
                  </span>
                </span>
              ) : null}
              {upcoming.service ? (
                <span className="tabular-nums text-muted-foreground">
                  {upcoming.service.duration_minutes} min ·{" "}
                  {formatGbp(upcoming.service.price_cents)}
                </span>
              ) : null}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            <div className="rounded-xl border border-border/50 bg-muted/15 p-3 dark:bg-muted/10">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Visit status · {arrivalStateLabel(upcoming.arrival_state)}
                </p>
                {opStatus ? (
                  <OperationalStatusChip status={opStatus} compact />
                ) : null}
              </div>
              <ArrivalFlowStrip state={upcoming.arrival_state} compact />
            </div>
            {showArrival ? (
              <VisitLiveStatusPanel appointment={upcoming} mode="customer" />
            ) : null}
          </CardContent>

          <CardFooter className="flex flex-col gap-2 border-t border-border/40 bg-muted/10 pt-4 sm:flex-row sm:flex-wrap dark:bg-muted/5">
            {showArrival ? (
              <Button
                asChild
                className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:w-auto"
              >
                <Link href={`/appointments/${upcoming.id}/check-in`}>
                  <MapPin className="mr-2 size-4" aria-hidden />
                  Check in
                </Link>
              </Button>
            ) : null}
            <Button
              asChild
              variant={showArrival ? "outline" : "default"}
              className={cn(
                "min-h-12 touch-manipulation sm:min-h-11",
                showArrival ? "w-full sm:w-auto" : "w-full sm:w-auto",
              )}
            >
              <Link href={`/appointments/${upcoming.id}/confirmation`}>
                Details
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:w-auto"
            >
              <Link href={`/appointments/${upcoming.id}/reschedule`}>
                Reschedule
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="dashboard-surface">
          <CardHeader className="space-y-2">
            <div className="flex size-11 items-center justify-center rounded-xl border border-border/50 bg-muted/20 text-muted-foreground">
              <CalendarClock className="size-5" aria-hidden />
            </div>
            <CardTitle className="text-lg">Nothing on the books</CardTitle>
            <CardDescription>
              Lock in your next chair — pick a service and time in under a
              minute.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:w-auto">
              <Link href="/book">Book a cut</Link>
            </Button>
          </CardFooter>
        </Card>
      )}
    </CustomerHomeSection>
  );
}
