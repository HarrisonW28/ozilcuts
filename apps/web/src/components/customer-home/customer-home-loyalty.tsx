"use client";

import { CustomerHomeSection } from "@/components/customer-home/customer-home-section";
import { VISIT_MILESTONES, type LoyaltyProgress } from "@/lib/customer-home";
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
import { Sparkles } from "lucide-react";
import Link from "next/link";

type CustomerHomeLoyaltyProps = {
  loyalty: LoyaltyProgress | null;
  visitsUnavailable: boolean;
};

export function CustomerHomeLoyalty({
  loyalty,
  visitsUnavailable,
}: CustomerHomeLoyaltyProps) {
  if (!loyalty && !visitsUnavailable) return null;

  return (
    <CustomerHomeSection id="home-loyalty-heading" title="Loyalty">
      <Card className="dashboard-surface overflow-hidden">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-primary/8 text-primary">
            <Sparkles className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg">Your rhythm</CardTitle>
            <CardDescription>
              {loyalty?.label ??
                "Visit milestones will show here once your history syncs."}
            </CardDescription>
          </div>
        </CardHeader>

        {loyalty ? (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{loyalty.totalVisits} visits</span>
                {loyalty.next !== null ? (
                  <span>
                    Next:{" "}
                    <span className="font-medium text-foreground">
                      {loyalty.next}
                    </span>
                  </span>
                ) : (
                  <span className="font-medium text-foreground">Complete</span>
                )}
              </div>
              <div
                className="relative h-3 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={loyalty.pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progress toward next visit milestone"
              >
                <div
                  className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-out"
                  style={{ width: `${loyalty.pct}%` }}
                />
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 right-0 flex justify-between px-0.5"
                  aria-hidden
                >
                  {VISIT_MILESTONES.map((m) => {
                    const reached = loyalty.totalVisits >= m;
                    return (
                      <span
                        key={m}
                        className={cn(
                          "mt-0.5 size-2 rounded-full border border-background",
                          reached ? "bg-primary" : "bg-muted-foreground/35",
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
            {loyalty.next === null ? (
              <p className="text-xs text-muted-foreground">
                You&apos;ve passed every milestone — thank you for showing up.
              </p>
            ) : null}
          </CardContent>
        ) : null}

        <CardFooter className={loyalty ? "border-t border-border/40 pt-4" : undefined}>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="min-h-11 w-full touch-manipulation sm:min-h-9 sm:w-auto"
          >
            <Link href="/profile/identity">Your studio story</Link>
          </Button>
        </CardFooter>
      </Card>
    </CustomerHomeSection>
  );
}
