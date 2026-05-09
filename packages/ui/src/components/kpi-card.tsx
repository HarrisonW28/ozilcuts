import * as React from "react";

import { cn } from "../lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Skeleton } from "./skeleton";

export type KpiCardProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
};

/**
 * Single KPI tile used across analytics dashboards. Standardises the
 * "small label / big number / muted hint" rhythm so that any new
 * dashboard automatically picks up consistent spacing, typography and
 * tabular numerals.
 */
function KpiCard({ label, value, hint, className }: KpiCardProps) {
  return (
    <Card
      data-slot="kpi-card"
      className={cn(
        "border-border/55 shadow-none dark:border-border",
        className,
      )}
    >
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint != null ? (
        <CardContent className="text-xs text-muted-foreground">
          {hint}
        </CardContent>
      ) : null}
    </Card>
  );
}

function KpiCardSkeleton({ className }: { className?: string }) {
  return (
    <Card
      aria-hidden
      className={cn(
        "border-border/55 shadow-none dark:border-border",
        className,
      )}
    >
      <CardHeader className="pb-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-7 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-40" />
      </CardContent>
    </Card>
  );
}

export { KpiCard, KpiCardSkeleton };
