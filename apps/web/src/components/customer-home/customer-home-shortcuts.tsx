"use client";

import { CustomerHomeSection } from "@/components/customer-home/customer-home-section";
import { buildBookFromRebookHint } from "@/lib/booking-url";
import { formatIsoDateShort } from "@/lib/customer-home";
import type { RebookSuggestion } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cn,
} from "@ozilcuts/ui";
import { Heart, RotateCcw } from "lucide-react";
import Link from "next/link";

type CustomerHomeShortcutsProps = {
  nextVisit: RebookSuggestion | null;
  preferredBarberName: string | null;
  favouriteBookHref: string | null;
};

export function CustomerHomeShortcuts({
  nextVisit,
  preferredBarberName,
  favouriteBookHref,
}: CustomerHomeShortcutsProps) {
  return (
    <CustomerHomeSection id="home-shortcuts-heading" title="Quick actions">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card
          className={cn(
            "dashboard-surface flex flex-col motion-safe:transition-shadow motion-safe:duration-200",
            nextVisit && "border-primary/25",
          )}
        >
          <CardHeader className="space-y-3 pb-2">
            <div className="flex size-10 items-center justify-center rounded-xl border border-border/50 bg-muted/20 text-foreground">
              <RotateCcw className="size-5" aria-hidden />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base">Quick rebook</CardTitle>
              {nextVisit ? (
                <CardDescription className="text-sm leading-snug">
                  {nextVisit.service?.name ?? "Your service"}
                  {nextVisit.barber ? ` · ${nextVisit.barber.name}` : ""}
                  <span className="mt-1 block tabular-nums text-foreground/85">
                    {formatIsoDateShort(nextVisit.suggested_date)}
                  </span>
                </CardDescription>
              ) : (
                <CardDescription>
                  After a few visits we&apos;ll suggest your next date here.
                </CardDescription>
              )}
            </div>
          </CardHeader>
          <CardFooter className="mt-auto pt-0">
            {nextVisit ? (
              <Button
                asChild
                className="min-h-12 w-full touch-manipulation sm:min-h-11"
              >
                <Link href={buildBookFromRebookHint(nextVisit)}>Use this cut</Link>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="min-h-12 w-full touch-manipulation sm:min-h-11"
              >
                <Link href="/book">Book now</Link>
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card className="dashboard-surface flex flex-col">
          <CardHeader className="space-y-3 pb-2">
            <div className="flex size-10 items-center justify-center rounded-xl border border-border/50 bg-muted/20 text-foreground">
              <Heart className="size-5" aria-hidden />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base">Favourite barber</CardTitle>
              <CardDescription className="text-sm leading-snug">
                {preferredBarberName ? (
                  <>
                    Start with{" "}
                    <span className="font-medium text-foreground">
                      {preferredBarberName}
                    </span>
                    .
                  </>
                ) : (
                  "Set a favourite in your profile for one-tap booking."
                )}
              </CardDescription>
            </div>
          </CardHeader>
          <CardFooter className="mt-auto flex flex-col gap-2 pt-0 sm:flex-row sm:flex-wrap">
            {favouriteBookHref ? (
              <Button
                asChild
                className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:flex-1"
              >
                <Link href={favouriteBookHref}>Book with them</Link>
              </Button>
            ) : null}
            <Button
              asChild
              variant="outline"
              className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:flex-1"
            >
              <Link href="/profile">Profile</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </CustomerHomeSection>
  );
}
