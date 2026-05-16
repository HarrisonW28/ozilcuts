"use client";

import { ShopChairCard } from "@/components/shop-operational/shop-chair-card";
import { getStoredAuthToken } from "@/lib/auth-token";
import { ApiError, fetchShopOperationalLive } from "@ozilcuts/api";
import type { ShopOperationalLiveSnapshot } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  KpiCard,
  Skeleton,
  cn,
} from "@ozilcuts/ui";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const POLL_MS = 30_000;

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: ShopOperationalLiveSnapshot }
  | { kind: "error"; message: string };

type ShopOperationalIntelligenceBoardProps = {
  /** Highlight this barber's chair card (e.g. signed-in barber). */
  highlightBarberUserId?: number;
  className?: string;
};

function formatPct(fraction: number): string {
  return `${(fraction * 100).toFixed(0)}%`;
}

export function ShopOperationalIntelligenceBoard({
  highlightBarberUserId,
  className,
}: ShopOperationalIntelligenceBoardProps) {
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    const token = getStoredAuthToken();
    if (!token) {
      setState({ kind: "error", message: "Sign in required." });
      return;
    }
    if (!silent) {
      setState({ kind: "loading" });
    } else {
      setRefreshing(true);
    }
    try {
      const data = await fetchShopOperationalLive(token);
      setState({ kind: "ok", data });
    } catch (e: unknown) {
      if (!silent) {
        setState({
          kind: "error",
          message:
            e instanceof ApiError
              ? e.message
              : "Could not load live shop intelligence.",
        });
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void load(true);
      }
    }, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  const sortedChairs = useMemo(() => {
    if (state.kind !== "ok") return [];
    return [...state.data.chairs].sort((a, b) => {
      const waitDiff = b.workload.waiting_count - a.workload.waiting_count;
      if (waitDiff !== 0) return waitDiff;
      return a.barber_name.localeCompare(b.barber_name);
    });
  }, [state]);

  if (state.kind === "loading" || state.kind === "idle") {
    return (
      <section
        className={cn("space-y-4", className)}
        aria-busy="true"
        aria-label="Loading live shop intelligence"
      >
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
        </div>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <Card className={cn("border-destructive/30", className)}>
        <CardHeader>
          <CardTitle>Live floor intelligence</CardTitle>
          <CardDescription>{state.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { data } = state;
  const { shop_summary: summary, queue_balance: balance, analytics } = data;

  return (
    <section
      className={cn("space-y-5", className)}
      aria-labelledby="shop-ops-live-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2
            id="shop-ops-live-heading"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            Live floor intelligence
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">
            {balance.headline}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-10 gap-1.5 touch-manipulation"
          disabled={refreshing}
          onClick={() => void load(true)}
        >
          <RefreshCw
            className={cn("size-4", refreshing && "motion-safe:animate-spin")}
            aria-hidden
          />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Chairs busy"
          value={`${summary.chairs_in_use} / ${summary.chairs_total}`}
        />
        <KpiCard
          label="Guests waiting"
          value={String(summary.guests_waiting_total)}
        />
        <KpiCard
          label="Shop utilization"
          value={formatPct(analytics.shop_utilization_pct)}
        />
        <KpiCard
          label="Visits left today"
          value={String(summary.remaining_today)}
        />
      </div>

      {balance.hints.length > 0 ? (
        <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Queue balancing</CardTitle>
            <CardDescription>
              Suggestions to keep the floor moving during busy stretches.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {balance.hints.map((hint) => (
                <li
                  key={`${hint.tone}-${hint.message}`}
                  className="rounded-lg border border-border/50 bg-background/80 px-3 py-2.5 text-sm leading-relaxed text-foreground"
                >
                  {hint.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {sortedChairs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No published chairs</CardTitle>
            <CardDescription>
              Publish barber profiles to see live chair states here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="shop-ops-chair-grid">
          {sortedChairs.map((chair) => (
            <ShopChairCard
              key={chair.barber_user_id}
              chair={chair}
              highlight={chair.barber_user_id === highlightBarberUserId}
            />
          ))}
        </div>
      )}

      <p className="text-center text-caption text-muted-foreground">
        Updated {new Date(data.updated_at).toLocaleTimeString()} · auto-refreshes
        every 30s
      </p>
    </section>
  );
}
