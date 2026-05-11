"use client";

import { getStoredAuthToken } from "@/lib/auth-token";
import { ApiError, fetchStaffCustomerSearch } from "@ozilcuts/api";
import type { StaffCustomerLookupRow } from "@ozilcuts/types";
import { Button, Label } from "@ozilcuts/ui";
import { useEffect, useRef, useState } from "react";

type StaffCustomerLookupProps = {
  value: StaffCustomerLookupRow | null;
  onChange: (row: StaffCustomerLookupRow | null) => void;
};

export function StaffCustomerLookup({
  value,
  onChange,
}: StaffCustomerLookupProps) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<StaffCustomerLookupRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [emptyNotice, setEmptyNotice] = useState(false);

  useEffect(() => {
    if (value !== null) {
      setDraft("");
      setOpen(false);
      setResults([]);
      setEmptyNotice(false);
    }
  }, [value]);

  useEffect(() => {
    if (value !== null) {
      return;
    }

    const q = draft.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      setEmptyNotice(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setEmptyNotice(false);

    const handle = window.setTimeout(() => {
      const token = getStoredAuthToken();
      if (!token) {
        if (!cancelled) {
          setLoading(false);
          setError("Sign in again to search customers.");
        }
        return;
      }

      fetchStaffCustomerSearch(token, q)
        .then((rows) => {
          if (cancelled) return;
          setResults(rows);
          setEmptyNotice(rows.length === 0);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setResults([]);
          setEmptyNotice(false);
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError("Could not load customers.");
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [draft, value]);

  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocMouseDown(ev: MouseEvent) {
      if (!open || value !== null) return;
      const el = rootRef.current;
      if (!el) return;
      if (ev.target instanceof Node && !el.contains(ev.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open, value]);

  if (value !== null) {
    return (
      <div className="space-y-2">
        <Label>Customer</Label>
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/65 bg-muted/10 px-4 py-3">
          <div className="min-w-0 space-y-0.5">
            <p className="truncate font-semibold text-foreground">{value.name}</p>
            <p className="truncate text-sm text-muted-foreground">{value.email}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 touch-manipulation"
            onClick={() => {
              onChange(null);
              setDraft("");
              setOpen(false);
            }}
          >
            Change
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative space-y-2">
      <Label htmlFor="staff-customer-search">Customer</Label>
      <input
        id="staff-customer-search"
        type="search"
        autoComplete="off"
        placeholder="Search name or email…"
        className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/50 flex h-12 w-full rounded-xl border px-3 text-base shadow-xs outline-none focus-visible:ring-[3px] sm:h-11 sm:text-sm"
        value={draft}
        onChange={(ev) => {
          setDraft(ev.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      <p className="text-xs text-muted-foreground">
        Type at least two characters to find a customer account.
      </p>

      {open && (loading || results.length > 0 || error !== null || emptyNotice) ? (
        <ul
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-xl border border-border/70 bg-popover p-1 text-popover-foreground shadow-md"
          aria-label="Matching customers"
        >
          {loading ? (
            <li className="px-3 py-2 text-sm text-muted-foreground" role="status">
              Searching…
            </li>
          ) : null}
          {error ? (
            <li className="px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </li>
          ) : null}
          {!loading && !error && emptyNotice ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              No customer matches that search.
            </li>
          ) : null}
          {!loading && !error
            ? results.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="motion-interactive flex w-full flex-col items-start rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted/80 touch-manipulation"
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => {
                      onChange(row);
                      setDraft("");
                      setOpen(false);
                    }}
                  >
                    <span className="font-medium text-foreground">{row.name}</span>
                    <span className="text-muted-foreground">{row.email}</span>
                  </button>
                </li>
              ))
            : null}
        </ul>
      ) : null}
    </div>
  );
}
