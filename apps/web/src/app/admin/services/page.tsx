"use client";

import { SiteHeader } from "@/components/site-header";
import { getStoredAuthToken } from "@/lib/auth-token";
import {
  formatGbp,
  penceFromPoundsInput,
  poundsInputFromPence,
} from "@/lib/format-gbp";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  ApiValidationError,
  createManagedService,
  deleteManagedService,
  fetchManageServices,
  updateManagedService,
} from "@ozilcuts/api";
import type {
  DepositPolicy,
  Paginated,
  ServiceManageRow,
} from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  ScreenTitle,
} from "@ozilcuts/ui";
import { OZILCUTS_APP_NAME } from "@ozilcuts/types";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ListState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; page: Paginated<ServiceManageRow> }
  | { kind: "error"; message: string };

export default function AdminServicesPage() {
  const { profile, signOut } = useSessionProfile();
  const [list, setList] = useState<ListState>({ kind: "idle" });
  const [page, setPage] = useState(1);

  const [cName, setCName] = useState("");
  const [cSlug, setCSlug] = useState("");
  const [cDescription, setCDescription] = useState("");
  const [cDuration, setCDuration] = useState("30");
  const [cPricePounds, setCPricePounds] = useState("35.00");
  const [cDepositPounds, setCDepositPounds] = useState("0");
  const [cDepositPolicy, setCDepositPolicy] =
    useState<DepositPolicy>("always");
  const [cSort, setCSort] = useState("0");
  const [cActive, setCActive] = useState(true);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createFieldErrors, setCreateFieldErrors] = useState<
    Record<string, string>
  >({});

  const [editingId, setEditingId] = useState<number | null>(null);
  const [eName, setEName] = useState("");
  const [eSlug, setESlug] = useState("");
  const [eDescription, setEDescription] = useState("");
  const [eDuration, setEDuration] = useState("");
  const [ePricePounds, setEPricePounds] = useState("");
  const [eDepositPounds, setEDepositPounds] = useState("");
  const [eDepositPolicy, setEDepositPolicy] =
    useState<DepositPolicy>("always");
  const [eSort, setESort] = useState("");
  const [eActive, setEActive] = useState(true);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteBusyId, setDeleteBusyId] = useState<number | null>(null);

  const load = useCallback(async (p: number) => {
    const token = getStoredAuthToken();
    if (!token) {
      setList({ kind: "error", message: "Sign in required." });

      return;
    }
    setList({ kind: "loading" });
    try {
      const data = await fetchManageServices(token, p);
      setList({ kind: "ok", page: data });
    } catch (e: unknown) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to load.";
      setList({ kind: "error", message });
    }
  }, []);

  useEffect(() => {
    if (profile.kind !== "ready" || profile.user.role.slug !== "admin") {
      return;
    }
    void load(page);
  }, [profile, page, load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = getStoredAuthToken();
    if (!token) return;
    setCreateBusy(true);
    setCreateError(null);
    setCreateFieldErrors({});
    try {
      const duration = Number.parseInt(cDuration, 10);
      const price = penceFromPoundsInput(cPricePounds);
      const deposit = penceFromPoundsInput(cDepositPounds);
      const sort = Number.parseInt(cSort, 10);
      await createManagedService(token, {
        name: cName,
        slug: cSlug.trim() === "" ? undefined : cSlug.trim(),
        description: cDescription.trim() === "" ? null : cDescription.trim(),
        duration_minutes: Number.isFinite(duration) ? duration : 30,
        price_cents: Number.isFinite(price) ? price : 0,
        deposit_cents: Number.isFinite(deposit) ? deposit : 0,
        deposit_policy: cDepositPolicy,
        sort_order: Number.isFinite(sort) ? sort : 0,
        is_active: cActive,
      });
      setCName("");
      setCSlug("");
      setCDescription("");
      setCDuration("30");
      setCPricePounds("35.00");
      setCDepositPounds("0");
      setCDepositPolicy("always");
      setCSort("0");
      setCActive(true);
      await load(page);
    } catch (err) {
      if (err instanceof ApiValidationError) {
        const fe = err.fieldErrors();
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(fe)) {
          if (v[0]) flat[k] = v[0];
        }
        setCreateFieldErrors(flat);
        setCreateError(err.firstMessage() ?? "Validation failed.");
      } else {
        setCreateError("Could not create service.");
      }
    } finally {
      setCreateBusy(false);
    }
  }

  function startEdit(row: ServiceManageRow) {
    setEditingId(row.id);
    setEName(row.name);
    setESlug(row.slug);
    setEDescription(row.description ?? "");
    setEDuration(String(row.duration_minutes));
    setEPricePounds(poundsInputFromPence(row.price_cents));
    setEDepositPounds(poundsInputFromPence(row.deposit_cents));
    setEDepositPolicy(row.deposit_policy);
    setESort(String(row.sort_order));
    setEActive(row.is_active);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function onSaveEdit(serviceId: number) {
    const token = getStoredAuthToken();
    if (!token) return;
    setEditBusy(true);
    setEditError(null);
    try {
      const duration = Number.parseInt(eDuration, 10);
      const price = penceFromPoundsInput(ePricePounds);
      const deposit = penceFromPoundsInput(eDepositPounds);
      const sort = Number.parseInt(eSort, 10);
      await updateManagedService(token, serviceId, {
        name: eName,
        slug: eSlug.trim() === "" ? "" : eSlug.trim(),
        description: eDescription.trim() === "" ? null : eDescription.trim(),
        duration_minutes: Number.isFinite(duration) ? duration : undefined,
        price_cents: Number.isFinite(price) ? price : undefined,
        deposit_cents: Number.isFinite(deposit) ? deposit : undefined,
        deposit_policy: eDepositPolicy,
        sort_order: Number.isFinite(sort) ? sort : undefined,
        is_active: eActive,
      });
      setEditingId(null);
      await load(page);
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setEditError(err.firstMessage() ?? "Validation failed.");
      } else {
        setEditError("Could not save.");
      }
    } finally {
      setEditBusy(false);
    }
  }

  async function onDelete(row: ServiceManageRow) {
    const ok = window.confirm(`Delete “${row.name}”? This cannot be undone.`);
    if (!ok) return;
    const token = getStoredAuthToken();
    if (!token) return;
    setDeleteBusyId(row.id);
    try {
      await deleteManagedService(token, row.id);
      await load(page);
    } catch {
      window.alert("Could not delete service.");
    } finally {
      setDeleteBusyId(null);
    }
  }

  const isAdmin =
    profile.kind === "ready" && profile.user.role.slug === "admin";

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader profile={profile} onSignOut={signOut} />
      <main
        id="main-content"
        className="page-main"
      >
        <div className="mx-auto w-full max-w-3xl page-stack">
          <ScreenTitle
            eyebrow={OZILCUTS_APP_NAME}
            title="Service catalog"
            description="Manage offerings, pricing, and visibility (admin only)."
          />

          {profile.kind === "loading" || profile.kind === "none" ? (
            <p className="text-sm text-muted-foreground" role="status">
              Loading…
            </p>
          ) : null}

          {profile.kind === "error" ? (
            <p className="text-sm text-destructive" role="alert">
              Session issue. Sign in again.
            </p>
          ) : null}

          {profile.kind === "ready" && !isAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle>Access denied</CardTitle>
                <CardDescription>
                  You need an administrator account to manage services.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link href="/">Home</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          {isAdmin ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Add service</CardTitle>
                  <CardDescription>
                    Slug is optional; a URL-safe value is generated from the
                    name when omitted.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="flex flex-col gap-4" onSubmit={onCreate}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="c-svc-name">Name</Label>
                        <Input
                          id="c-svc-name"
                          value={cName}
                          onChange={(ev) => setCName(ev.target.value)}
                          required
                          aria-invalid={
                            createFieldErrors.name ? true : undefined
                          }
                        />
                        {createFieldErrors.name ? (
                          <p className="text-sm text-destructive">
                            {createFieldErrors.name}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="c-svc-slug">Slug (optional)</Label>
                        <Input
                          id="c-svc-slug"
                          value={cSlug}
                          onChange={(ev) => setCSlug(ev.target.value)}
                          aria-invalid={
                            createFieldErrors.slug ? true : undefined
                          }
                        />
                        {createFieldErrors.slug ? (
                          <p className="text-sm text-destructive">
                            {createFieldErrors.slug}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="c-svc-desc">Description</Label>
                      <textarea
                        id="c-svc-desc"
                        className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 flex min-h-24 w-full rounded-lg border px-3 py-2 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:min-h-20 sm:text-sm"
                        value={cDescription}
                        onChange={(ev) => setCDescription(ev.target.value)}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="c-svc-dur">Duration (minutes)</Label>
                        <Input
                          id="c-svc-dur"
                          inputMode="numeric"
                          value={cDuration}
                          onChange={(ev) => setCDuration(ev.target.value)}
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="c-svc-price">Price (£)</Label>
                        <Input
                          id="c-svc-price"
                          inputMode="decimal"
                          value={cPricePounds}
                          onChange={(ev) => setCPricePounds(ev.target.value)}
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="c-svc-deposit">Deposit (£)</Label>
                        <Input
                          id="c-svc-deposit"
                          inputMode="decimal"
                          value={cDepositPounds}
                          onChange={(ev) => setCDepositPounds(ev.target.value)}
                          aria-invalid={
                            createFieldErrors.deposit_cents ? true : undefined
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Set to 0 to disable. Must not exceed the price.
                        </p>
                        {createFieldErrors.deposit_cents ? (
                          <p className="text-sm text-destructive">
                            {createFieldErrors.deposit_cents}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="c-svc-policy">Deposit policy</Label>
                        <select
                          id="c-svc-policy"
                          value={cDepositPolicy}
                          onChange={(ev) =>
                            setCDepositPolicy(
                              ev.target.value as DepositPolicy,
                            )
                          }
                          className="border-input bg-background text-foreground focus-visible:ring-ring/50 flex h-11 w-full rounded-lg border px-3 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:h-10 sm:text-sm"
                        >
                          <option value="always">Every booking</option>
                          <option value="first_time_customer">
                            First-time customers only
                          </option>
                        </select>
                        <p className="text-xs text-muted-foreground">
                          With “first-time customers only”, returning
                          customers skip the deposit.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="c-svc-sort">Sort order</Label>
                        <Input
                          id="c-svc-sort"
                          inputMode="numeric"
                          value={cSort}
                          onChange={(ev) => setCSort(ev.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="c-svc-active"
                        type="checkbox"
                        className="size-4 rounded border-input"
                        checked={cActive}
                        onChange={(ev) => setCActive(ev.target.checked)}
                      />
                      <Label htmlFor="c-svc-active">
                        Active on public catalog
                      </Label>
                    </div>
                    {createError ? (
                      <p className="text-sm text-destructive" role="alert">
                        {createError}
                      </p>
                    ) : null}
                    <Button type="submit" disabled={createBusy}>
                      {createBusy ? "Creating…" : "Create service"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <section aria-labelledby="svc-list-heading">
                <h2 id="svc-list-heading" className="mb-4 text-lg font-semibold">
                  Services
                </h2>
                {list.kind === "loading" || list.kind === "idle" ? (
                  <p className="text-sm text-muted-foreground">Loading list…</p>
                ) : null}
                {list.kind === "error" ? (
                  <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-4">
                    <p className="text-sm text-destructive">{list.message}</p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="self-start"
                      onClick={() => void load(page)}
                    >
                      Retry
                    </Button>
                  </div>
                ) : null}
                {list.kind === "ok" ? (
                  <ul className="flex flex-col gap-4">
                    {list.page.data.map((row) => (
                      <li key={row.id}>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                              {row.name}
                            </CardTitle>
                            <CardDescription className="font-mono text-xs">
                              {row.slug}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {editingId === row.id ? (
                              <>
                                <div className="flex flex-col gap-2">
                                  <Label htmlFor={`e-name-${row.id}`}>
                                    Name
                                  </Label>
                                  <Input
                                    id={`e-name-${row.id}`}
                                    value={eName}
                                    onChange={(ev) =>
                                      setEName(ev.target.value)
                                    }
                                  />
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Label htmlFor={`e-slug-${row.id}`}>
                                    Slug
                                  </Label>
                                  <Input
                                    id={`e-slug-${row.id}`}
                                    value={eSlug}
                                    onChange={(ev) =>
                                      setESlug(ev.target.value)
                                    }
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Clear slug to regenerate from the name.
                                  </p>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Label htmlFor={`e-desc-${row.id}`}>
                                    Description
                                  </Label>
                                  <textarea
                                    id={`e-desc-${row.id}`}
                                    className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 flex min-h-24 w-full rounded-lg border px-3 py-2 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:text-sm"
                                    value={eDescription}
                                    onChange={(ev) =>
                                      setEDescription(ev.target.value)
                                    }
                                  />
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <div className="flex flex-col gap-2">
                                    <Label htmlFor={`e-dur-${row.id}`}>
                                      Duration (min)
                                    </Label>
                                    <Input
                                      id={`e-dur-${row.id}`}
                                      inputMode="numeric"
                                      value={eDuration}
                                      onChange={(ev) =>
                                        setEDuration(ev.target.value)
                                      }
                                    />
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <Label htmlFor={`e-price-${row.id}`}>
                                      Price (£)
                                    </Label>
                                    <Input
                                      id={`e-price-${row.id}`}
                                      inputMode="decimal"
                                      value={ePricePounds}
                                      onChange={(ev) =>
                                        setEPricePounds(ev.target.value)
                                      }
                                    />
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <Label htmlFor={`e-deposit-${row.id}`}>
                                      Deposit (£)
                                    </Label>
                                    <Input
                                      id={`e-deposit-${row.id}`}
                                      inputMode="decimal"
                                      value={eDepositPounds}
                                      onChange={(ev) =>
                                        setEDepositPounds(ev.target.value)
                                      }
                                    />
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <Label htmlFor={`e-policy-${row.id}`}>
                                      Deposit policy
                                    </Label>
                                    <select
                                      id={`e-policy-${row.id}`}
                                      value={eDepositPolicy}
                                      onChange={(ev) =>
                                        setEDepositPolicy(
                                          ev.target.value as DepositPolicy,
                                        )
                                      }
                                      className="border-input bg-background text-foreground focus-visible:ring-ring/50 flex h-11 w-full rounded-lg border px-3 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:h-10 sm:text-sm"
                                    >
                                      <option value="always">
                                        Every booking
                                      </option>
                                      <option value="first_time_customer">
                                        First-time customers only
                                      </option>
                                    </select>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <Label htmlFor={`e-sort-${row.id}`}>
                                      Sort
                                    </Label>
                                    <Input
                                      id={`e-sort-${row.id}`}
                                      inputMode="numeric"
                                      value={eSort}
                                      onChange={(ev) =>
                                        setESort(ev.target.value)
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    id={`e-act-${row.id}`}
                                    type="checkbox"
                                    className="size-4 rounded border-input"
                                    checked={eActive}
                                    onChange={(ev) =>
                                      setEActive(ev.target.checked)
                                    }
                                  />
                                  <Label htmlFor={`e-act-${row.id}`}>
                                    Active
                                  </Label>
                                </div>
                                {editError ? (
                                  <p
                                    className="text-sm text-destructive"
                                    role="alert"
                                  >
                                    {editError}
                                  </p>
                                ) : null}
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    disabled={editBusy}
                                    onClick={() => void onSaveEdit(row.id)}
                                  >
                                    {editBusy ? "Saving…" : "Save"}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={editBusy}
                                    onClick={cancelEdit}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    Duration:{" "}
                                  </span>
                                  {row.duration_minutes} min
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    Price:{" "}
                                  </span>
                                  {formatGbp(row.price_cents)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    Deposit:{" "}
                                  </span>
                                  {row.deposit_cents > 0
                                    ? formatGbp(row.deposit_cents)
                                    : "None"}
                                  {row.deposit_cents > 0 ? (
                                    <span className="ml-2 text-xs">
                                      (
                                      {row.deposit_policy ===
                                      "first_time_customer"
                                        ? "first-time only"
                                        : "every booking"}
                                      )
                                    </span>
                                  ) : null}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    Sort:{" "}
                                  </span>
                                  {row.sort_order}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    Active:{" "}
                                  </span>
                                  {row.is_active ? "Yes" : "No"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    Description:{" "}
                                  </span>
                                  {row.description ?? "—"}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => startEdit(row)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    disabled={deleteBusyId === row.id}
                                    onClick={() => void onDelete(row)}
                                  >
                                    {deleteBusyId === row.id
                                      ? "Deleting…"
                                      : "Delete"}
                                  </Button>
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {list.kind === "ok" && list.page.meta.last_page > 1 ? (
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      Page {list.page.meta.current_page} of{" "}
                      {list.page.meta.last_page}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={list.page.meta.current_page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          list.page.meta.current_page >=
                          list.page.meta.last_page
                        }
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                ) : null}
              </section>

              <p className="text-center text-sm text-muted-foreground">
                <Link href="/" className="underline-offset-4 hover:underline">
                  Home
                </Link>
              </p>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
