"use client";

import { getStoredAuthToken } from "@/lib/auth-token";
import {
  ApiError,
  fetchCustomerRelationship,
  updateCustomerVip,
} from "@ozilcuts/api";
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
import { Cake, Crown, Gift, History, Pin, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: CustomerRelationshipSnapshot }
  | { kind: "error"; message: string };

type CustomerRelationshipPanelProps = {
  customerUserId: number;
  customerName?: string;
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CustomerRelationshipPanel({
  customerUserId,
  customerName,
}: CustomerRelationshipPanelProps) {
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [vipBusy, setVipBusy] = useState(false);
  const [vipError, setVipError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Sign in required." });
      return;
    }
    setState({ kind: "loading" });
    try {
      const data = await fetchCustomerRelationship(token, customerUserId);
      setState({ kind: "ok", data });
    } catch (e: unknown) {
      setState({
        kind: "error",
        message:
          e instanceof ApiError
            ? e.message
            : "Could not load relationship profile.",
      });
    }
  }, [customerUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleVip(next: boolean) {
    const token = getStoredAuthToken();
    if (!token || state.kind !== "ok") return;
    setVipBusy(true);
    setVipError(null);
    try {
      const data = await updateCustomerVip(token, customerUserId, {
        is_vip: next,
      });
      setState({ kind: "ok", data });
    } catch (e: unknown) {
      setVipError(
        e instanceof ApiError ? e.message : "Could not update VIP status.",
      );
    } finally {
      setVipBusy(false);
    }
  }

  if (state.kind === "loading" || state.kind === "idle") {
    return (
      <Card className="mt-6 border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Relationship</CardTitle>
          <CardDescription>Loading personalization…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (state.kind === "error") {
    return (
      <Card className="mt-6 border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Relationship</CardTitle>
          <CardDescription>{state.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="secondary" size="sm" onClick={() => void load()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { data } = state;
  const displayName = customerName ?? data.customer_name;
  const { birthday, milestones, loyalty_history, relationship_notes } = data;

  return (
    <Card className="mt-6 overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shadow-sm dark:from-primary/10">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg leading-snug">
              {displayName}&rsquo;s relationship
            </CardTitle>
            <CardDescription>
              Birthdays, milestones, loyalty, and notes — tuned for a personal
              visit.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant={data.is_vip ? "default" : "outline"}
            className={cn(
              "min-h-10 touch-manipulation gap-1.5",
              data.is_vip && "shadow-sm",
            )}
            disabled={vipBusy}
            onClick={() => void toggleVip(!data.is_vip)}
          >
            <Crown className="size-4" aria-hidden />
            {data.is_vip ? "VIP" : "Mark VIP"}
          </Button>
        </div>
        {vipError ? (
          <p className="text-sm text-destructive">{vipError}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {data.is_vip ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-foreground">
              <Crown className="size-3.5" aria-hidden />
              VIP guest
            </span>
          ) : null}
          {birthday.has_date ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                birthday.is_today
                  ? "border-primary/40 bg-primary/15 text-foreground"
                  : birthday.is_soon
                    ? "border-amber-500/35 bg-amber-500/10 text-foreground"
                    : "border-border/60 bg-muted/20 text-foreground/90",
              )}
            >
              <Cake className="size-3.5" aria-hidden />
              {birthday.is_today
                ? `Birthday today — ${birthday.display}`
                : birthday.is_soon
                  ? `Birthday in ${birthday.days_until} days — ${birthday.display}`
                  : birthday.display}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/60 px-2.5 py-0.5 text-xs text-muted-foreground">
              <Cake className="size-3.5" aria-hidden />
              Birthday not shared
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/15 px-2.5 py-0.5 text-xs font-medium text-foreground/90">
            <Sparkles className="size-3.5" aria-hidden />
            {data.visit_summary.total_visits} visit
            {data.visit_summary.total_visits === 1 ? "" : "s"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pb-6">
        {milestones.next ? (
          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Gift className="size-4 text-primary" aria-hidden />
              Next milestone
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">
                {milestones.next.label}
              </span>{" "}
              at {milestones.next.visit_count} visits —{" "}
              {milestones.next.visits_remaining ?? 0} to go.
            </p>
            {milestones.achieved.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Earned:{" "}
                {milestones.achieved.map((m) => m.label).join(" · ")}
              </p>
            ) : null}
          </section>
        ) : milestones.achieved.length > 0 ? (
          <section className="space-y-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Gift className="size-4 text-primary" aria-hidden />
              Milestones
            </h3>
            <p className="text-sm text-muted-foreground">
              {milestones.achieved.map((m) => m.label).join(" · ")}
            </p>
          </section>
        ) : null}

        {loyalty_history.length > 0 ? (
          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <History className="size-4 text-primary" aria-hidden />
              Loyalty history
            </h3>
            <ul className="space-y-2">
              {loyalty_history.slice(0, 6).map((event, index) => (
                <li
                  key={`${event.kind}-${event.occurred_at ?? index}-${event.label}`}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="text-foreground">
                    {event.kind === "milestone" ? (
                      <span className="font-medium">{event.label}</span>
                    ) : (
                      event.label
                    )}
                    {event.visit_number != null ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · visit {event.visit_number}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {formatWhen(event.occurred_at)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {relationship_notes.length > 0 ? (
          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Pin className="size-4 text-primary" aria-hidden />
              Relationship notes
            </h3>
            <ul className="space-y-2">
              {relationship_notes.map((note) => (
                <li
                  key={note.id}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm leading-relaxed",
                    note.pinned
                      ? "border-primary/25 bg-primary/5 dark:bg-primary/10"
                      : "border-border/60 bg-muted/10",
                  )}
                >
                  {note.pinned ? (
                    <span className="mb-1 block text-xs font-medium text-primary">
                      Pinned
                    </span>
                  ) : null}
                  <p className="text-foreground">{note.body}</p>
                  {note.author_name ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {note.author_name}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Add or edit notes below.
            </p>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
