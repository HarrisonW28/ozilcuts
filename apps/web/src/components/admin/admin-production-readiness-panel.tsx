"use client";

import type {
  ProductionReadinessItem,
  ProductionSecurityReview,
} from "@ozilcuts/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from "@ozilcuts/ui";
import { CheckCircle2, AlertTriangle, XCircle, ClipboardCheck } from "lucide-react";

type AdminProductionReadinessPanelProps = {
  review: ProductionSecurityReview;
};

function StatusIcon({ status }: { status: string }) {
  if (status === "pass") {
    return <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />;
  }
  if (status === "warn") {
    return <AlertTriangle className="size-4 text-amber-600" aria-hidden />;
  }

  return <XCircle className="size-4 text-destructive" aria-hidden />;
}

function overallLabel(status: string): string {
  switch (status) {
    case "pass":
      return "Ready";
    case "warn":
      return "Review recommended";
    default:
      return "Action required";
  }
}

function ItemRow({ item }: { item: ProductionReadinessItem }) {
  return (
    <li className="flex gap-3 rounded-lg border border-border/40 px-3 py-2.5">
      <StatusIcon status={item.status} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{item.label}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
      </div>
    </li>
  );
}

export function AdminProductionReadinessPanel({
  review,
}: AdminProductionReadinessPanelProps) {
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          <ClipboardCheck className="size-5 text-primary" aria-hidden />
          Production readiness
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
              review.overall_status === "pass" && "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
              review.overall_status === "warn" && "bg-amber-500/15 text-amber-900 dark:text-amber-100",
              review.overall_status === "fail" && "bg-destructive/15 text-destructive",
            )}
          >
            {overallLabel(review.overall_status)}
          </span>
        </CardTitle>
        <CardDescription>
          Automated dependency, auth, API, infrastructure, and upload checks for production scale.
          Manual penetration and deployment steps live in{" "}
          <code className="text-xs">{review.manual_review.penetration_checklist}</code> and{" "}
          <code className="text-xs">{review.manual_review.deployment_guide}</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {review.sections.map((section) => (
          <section key={section.id} aria-labelledby={`readiness-${section.id}`}>
            <h3
              id={`readiness-${section.id}`}
              className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"
            >
              <StatusIcon status={section.status} />
              {section.title}
            </h3>
            <ul className="space-y-2">
              {section.items.map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </ul>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
