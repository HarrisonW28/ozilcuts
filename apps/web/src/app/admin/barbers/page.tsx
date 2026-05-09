"use client";

import { SiteHeader } from "@/components/site-header";
import { getStoredAuthToken } from "@/lib/auth-token";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  ApiError,
  ApiValidationError,
  createManagedBarber,
  fetchManageBarbers,
  updateManagedBarberProfile,
} from "@ozilcuts/api";
import type { BarberManageRow, Paginated } from "@ozilcuts/types";
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
  | { kind: "ok"; page: Paginated<BarberManageRow> }
  | { kind: "error"; message: string };

export default function AdminBarbersPage() {
  const { profile, signOut } = useSessionProfile();
  const [list, setList] = useState<ListState>({ kind: "idle" });
  const [page, setPage] = useState(1);

  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [cPasswordConf, setCPasswordConf] = useState("");
  const [cTitle, setCTitle] = useState("");
  const [cBio, setCBio] = useState("");
  const [cYears, setCYears] = useState("");
  const [cPublished, setCPublished] = useState(true);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createFieldErrors, setCreateFieldErrors] = useState<
    Record<string, string>
  >({});

  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [eTitle, setETitle] = useState("");
  const [eBio, setEBio] = useState("");
  const [eYears, setEYears] = useState("");
  const [ePublished, setEPublished] = useState(true);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(
    async (p: number) => {
      const token = getStoredAuthToken();
      if (!token) {
        setList({ kind: "error", message: "Sign in required." });

        return;
      }
      setList({ kind: "loading" });
      try {
        const data = await fetchManageBarbers(token, p);
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
    },
    [],
  );

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
      const years =
        cYears.trim() === "" ? undefined : Number.parseInt(cYears, 10);
      await createManagedBarber(token, {
        name: cName,
        email: cEmail,
        password: cPassword,
        password_confirmation: cPasswordConf,
        title: cTitle.trim() || undefined,
        bio: cBio.trim() || undefined,
        years_experience: Number.isFinite(years) ? years : undefined,
        is_published: cPublished,
      });
      setCName("");
      setCEmail("");
      setCPassword("");
      setCPasswordConf("");
      setCTitle("");
      setCBio("");
      setCYears("");
      setCPublished(true);
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
        setCreateError("Could not create barber.");
      }
    } finally {
      setCreateBusy(false);
    }
  }

  function startEdit(row: BarberManageRow) {
    setEditingUserId(row.user.id);
    setETitle(row.title ?? "");
    setEBio(row.bio ?? "");
    setEYears(row.years_experience != null ? String(row.years_experience) : "");
    setEPublished(row.is_published);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingUserId(null);
    setEditError(null);
  }

  async function onSaveEdit(userId: number) {
    const token = getStoredAuthToken();
    if (!token) return;
    setEditBusy(true);
    setEditError(null);
    try {
      const yParsed =
        eYears.trim() === "" ? NaN : Number.parseInt(eYears, 10);
      await updateManagedBarberProfile(token, userId, {
        title: eTitle.trim() === "" ? null : eTitle.trim(),
        bio: eBio.trim() === "" ? null : eBio.trim(),
        years_experience: Number.isFinite(yParsed) ? yParsed : null,
        is_published: ePublished,
      });
      setEditingUserId(null);
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

  const isAdmin = profile.kind === "ready" && profile.user.role.slug === "admin";

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
            title="Barber management"
            description="Create barber accounts, edit profiles, and control directory visibility (admin only)."
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
                  You need an administrator account to manage barbers.
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
                  <CardTitle>Add barber</CardTitle>
                  <CardDescription>
                    Creates a user with the barber role and a public profile.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="flex flex-col gap-4" onSubmit={onCreate}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="c-name">Name</Label>
                        <Input
                          id="c-name"
                          value={cName}
                          onChange={(ev) => setCName(ev.target.value)}
                          required
                          autoComplete="name"
                          aria-invalid={createFieldErrors.name ? true : undefined}
                        />
                        {createFieldErrors.name ? (
                          <p className="text-sm text-destructive">
                            {createFieldErrors.name}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="c-email">Email</Label>
                        <Input
                          id="c-email"
                          type="email"
                          value={cEmail}
                          onChange={(ev) => setCEmail(ev.target.value)}
                          required
                          autoComplete="email"
                          aria-invalid={
                            createFieldErrors.email ? true : undefined
                          }
                        />
                        {createFieldErrors.email ? (
                          <p className="text-sm text-destructive">
                            {createFieldErrors.email}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="c-pass">Password</Label>
                        <Input
                          id="c-pass"
                          type="password"
                          value={cPassword}
                          onChange={(ev) => setCPassword(ev.target.value)}
                          required
                          autoComplete="new-password"
                          aria-invalid={
                            createFieldErrors.password ? true : undefined
                          }
                        />
                        {createFieldErrors.password ? (
                          <p className="text-sm text-destructive">
                            {createFieldErrors.password}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="c-pass2">Confirm password</Label>
                        <Input
                          id="c-pass2"
                          type="password"
                          value={cPasswordConf}
                          onChange={(ev) => setCPasswordConf(ev.target.value)}
                          required
                          autoComplete="new-password"
                          aria-invalid={
                            createFieldErrors.password_confirmation
                              ? true
                              : undefined
                          }
                        />
                        {createFieldErrors.password_confirmation ? (
                          <p className="text-sm text-destructive">
                            {createFieldErrors.password_confirmation}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="c-title">Title (optional)</Label>
                        <Input
                          id="c-title"
                          value={cTitle}
                          onChange={(ev) => setCTitle(ev.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="c-years">Years experience</Label>
                        <Input
                          id="c-years"
                          inputMode="numeric"
                          value={cYears}
                          onChange={(ev) => setCYears(ev.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="c-bio">Bio (optional)</Label>
                      <textarea
                        id="c-bio"
                        className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 flex min-h-24 w-full rounded-lg border px-3 py-2 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:min-h-20 sm:text-sm"
                        value={cBio}
                        onChange={(ev) => setCBio(ev.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="c-pub"
                        type="checkbox"
                        className="size-4 rounded border-input"
                        checked={cPublished}
                        onChange={(ev) => setCPublished(ev.target.checked)}
                      />
                      <Label htmlFor="c-pub">Published in directory</Label>
                    </div>
                    {createError ? (
                      <p className="text-sm text-destructive" role="alert">
                        {createError}
                      </p>
                    ) : null}
                    <Button type="submit" disabled={createBusy}>
                      {createBusy ? "Creating…" : "Create barber"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <section aria-labelledby="barber-list-heading">
                <h2 id="barber-list-heading" className="mb-4 text-lg font-semibold">
                  Team
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
                              {row.user.name}
                            </CardTitle>
                            <CardDescription>{row.user.email}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {editingUserId === row.user.id ? (
                              <>
                                <div className="flex flex-col gap-2">
                                  <Label htmlFor={`e-title-${row.user.id}`}>
                                    Title
                                  </Label>
                                  <Input
                                    id={`e-title-${row.user.id}`}
                                    value={eTitle}
                                    onChange={(ev) => setETitle(ev.target.value)}
                                  />
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Label htmlFor={`e-bio-${row.user.id}`}>
                                    Bio
                                  </Label>
                                  <textarea
                                    id={`e-bio-${row.user.id}`}
                                    className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 flex min-h-24 w-full rounded-lg border px-3 py-2 text-base shadow-sm outline-none focus-visible:ring-[3px] sm:text-sm"
                                    value={eBio}
                                    onChange={(ev) => setEBio(ev.target.value)}
                                  />
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Label htmlFor={`e-years-${row.user.id}`}>
                                    Years experience
                                  </Label>
                                  <Input
                                    id={`e-years-${row.user.id}`}
                                    inputMode="numeric"
                                    value={eYears}
                                    onChange={(ev) => setEYears(ev.target.value)}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    id={`e-pub-${row.user.id}`}
                                    type="checkbox"
                                    className="size-4 rounded border-input"
                                    checked={ePublished}
                                    onChange={(ev) =>
                                      setEPublished(ev.target.checked)
                                    }
                                  />
                                  <Label htmlFor={`e-pub-${row.user.id}`}>
                                    Published
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
                                    onClick={() => void onSaveEdit(row.user.id)}
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
                                    Title:{" "}
                                  </span>
                                  {row.title ?? "—"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    Bio:{" "}
                                  </span>
                                  {row.bio ?? "—"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    Published:{" "}
                                  </span>
                                  {row.is_published ? "Yes" : "No"}
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
                                  <Button asChild size="sm" variant="outline">
                                    <Link
                                      href={`/admin/barbers/${row.user.id}/analytics`}
                                    >
                                      Analytics
                                    </Link>
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
                          list.page.meta.current_page >= list.page.meta.last_page
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
