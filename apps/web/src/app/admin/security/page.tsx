"use client";

import { AdminAuditLogPanel } from "@/components/admin/admin-audit-log-panel";
import { AdminProductionReadinessPanel } from "@/components/admin/admin-production-readiness-panel";
import { AdminSecurityReviewPanel } from "@/components/admin/admin-security-review-panel";
import { PageSessionSkeleton } from "@/components/loading";
import { SiteHeader } from "@/components/site-header";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  fetchAdminAuditLogs,
  fetchAdminSecurityReview,
  fetchProductionSecurityReview,
} from "@ozilcuts/api";
import type {
  AdminSecurityReview,
  AuditLogEntry,
  AuditLogIndexMeta,
  ProductionSecurityReview,
} from "@ozilcuts/types";
import { Button, ScreenTitle } from "@ozilcuts/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ReviewState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: AdminSecurityReview }
  | { kind: "error"; message: string };

export default function AdminSecurityPage() {
  const { profile, signOut } = useSessionProfile();
  const isAdmin =
    profile.kind === "ready" && profile.user.role.slug === "admin";

  const [reviewState, setReviewState] = useState<ReviewState>({ kind: "idle" });
  const [productionState, setProductionState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ok"; data: ProductionSecurityReview }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [meta, setMeta] = useState<AuditLogIndexMeta | null>(null);
  const [logLoading, setLogLoading] = useState(false);
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [page, setPage] = useState(1);

  const loadReview = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      setReviewState({ kind: "error", message: "Sign in required." });
      return;
    }
    setReviewState({ kind: "loading" });
    try {
      const data = await fetchAdminSecurityReview(token);
      setReviewState({ kind: "ok", data });
    } catch (e: unknown) {
      setReviewState({
        kind: "error",
        message: e instanceof ApiError ? e.message : "Could not load security review.",
      });
    }
  }, []);

  const loadLogs = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) return;
    setLogLoading(true);
    try {
      const res = await fetchAdminAuditLogs(token, {
        category: category || undefined,
        severity: severity || undefined,
        page,
      });
      setEntries(res.data);
      setMeta(res.meta);
    } catch {
      setEntries([]);
      setMeta(null);
    } finally {
      setLogLoading(false);
    }
  }, [category, severity, page]);

  const loadProduction = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) return;
    setProductionState({ kind: "loading" });
    try {
      const data = await fetchProductionSecurityReview(token);
      setProductionState({ kind: "ok", data });
    } catch (e: unknown) {
      setProductionState({
        kind: "error",
        message:
          e instanceof ApiError ? e.message : "Could not load production review.",
      });
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void loadReview();
    void loadProduction();
  }, [isAdmin, loadReview, loadProduction]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadLogs();
  }, [isAdmin, loadLogs]);

  if (profile.kind === "loading" || profile.kind === "none") {
    return (
      <div className="flex min-h-dvh flex-1 flex-col">
        <SiteHeader profile={profile} onSignOut={signOut} />
        <main id="main-content" className="page-main">
          <PageSessionSkeleton statusLabel="Loading security" />
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-dvh flex-1 flex-col">
        <SiteHeader profile={profile} onSignOut={signOut} />
        <main
          id="main-content"
          className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10"
        >
          <p className="text-sm text-muted-foreground">
            Security review is for shop administrators.
          </p>
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main id="main-content" className="page-main app-shell-scroll flex-1">
        <div className="mx-auto w-full max-w-5xl page-stack">
          <ScreenTitle
            title="Security & audit"
            description="Enterprise accountability — privileged actions, auth events, and role changes in one place."
          />
          <p className="text-sm text-muted-foreground">
            <Link href="/admin" className="underline-offset-4 hover:underline">
              ← Admin dashboard
            </Link>
          </p>

          {reviewState.kind === "loading" || reviewState.kind === "idle" ? (
            <PageSessionSkeleton statusLabel="Loading security review" />
          ) : null}

          {reviewState.kind === "error" ? (
            <p className="text-sm text-destructive" role="alert">
              {reviewState.message}
            </p>
          ) : null}

          {reviewState.kind === "ok" ? (
            <AdminSecurityReviewPanel review={reviewState.data} />
          ) : null}

          {productionState.kind === "ok" ? (
            <AdminProductionReadinessPanel review={productionState.data} />
          ) : null}

          {productionState.kind === "error" ? (
            <p className="text-sm text-destructive" role="alert">
              {productionState.message}
            </p>
          ) : null}

          <AdminAuditLogPanel
            entries={entries}
            meta={meta}
            loading={logLoading}
            category={category}
            severity={severity}
            onCategoryChange={(v) => {
              setCategory(v);
              setPage(1);
            }}
            onSeverityChange={(v) => {
              setSeverity(v);
              setPage(1);
            }}
            onPageChange={setPage}
          />
        </div>
      </main>
    </div>
  );
}
