"use client";

import { getStoredAuthToken } from "@/lib/auth-token";
import { ApiError, fetchSelfCustomerRelationship } from "@ozilcuts/api";
import type { CustomerRelationshipSnapshot } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from "@ozilcuts/ui";
import { Cake, Gift, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: CustomerRelationshipSnapshot }
  | { kind: "error"; message: string };

export function CustomerRelationshipSelfCard() {
  const [state, setState] = useState<LoadState>({ kind: "idle" });

  const load = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Sign in required." });
      return;
    }
    setState({ kind: "loading" });
    try {
      const data = await fetchSelfCustomerRelationship(token);
      setState({ kind: "ok", data });
    } catch (e: unknown) {
      setState({
        kind: "error",
        message:
          e instanceof ApiError
            ? e.message
            : "Could not load your relationship highlights.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.kind === "loading" || state.kind === "idle") {
    return null;
  }

  if (state.kind === "error") {
    return null;
  }

  const { data } = state;
  const { birthday, milestones } = data;
  const showBirthdayCta = !birthday.has_date;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg">Personal touches</CardTitle>
        <CardDescription>
          Milestones and birthdays help your barber make every visit feel like
          yours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {birthday.has_date ? (
          <p
            className={cn(
              "flex items-center gap-2 text-sm",
              birthday.is_today || birthday.is_soon
                ? "font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            <Cake className="size-4 shrink-0 text-primary" aria-hidden />
            {birthday.is_today
              ? `Happy birthday, ${data.customer_name.split(/\s+/)[0] ?? "friend"}!`
              : birthday.is_soon
                ? `Your birthday (${birthday.display}) is coming up.`
                : `Birthday on ${birthday.display}.`}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Share your birthday on your profile for a little extra care on your
            day.
          </p>
        )}

        {milestones.next ? (
          <p className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
            <Gift className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              <span className="font-medium text-foreground">
                {milestones.next.label}
              </span>{" "}
              unlocks at {milestones.next.visit_count} visits —{" "}
              {milestones.next.visits_remaining ?? 0} more to go.
            </span>
          </p>
        ) : milestones.achieved.length > 0 ? (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            You&rsquo;ve earned every studio milestone — thank you for showing up.
          </p>
        ) : null}

        {showBirthdayCta ? (
          <Button asChild variant="outline" size="sm" className="min-h-10">
            <Link href="/profile">Add birthday on profile</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
