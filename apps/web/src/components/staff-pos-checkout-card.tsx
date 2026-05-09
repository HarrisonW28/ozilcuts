"use client";

import { ApiError, fetchPaymentConfig } from "@ozilcuts/api";
import type { AppointmentRecord, PaymentConfig } from "@ozilcuts/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ozilcuts/ui";
import { useCallback, useEffect, useState } from "react";

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

type StaffPosCheckoutCardProps = {
  appointment: AppointmentRecord;
  /** Path only, e.g. `/appointments/12/confirmation` */
  confirmationPath: string;
};

export function StaffPosCheckoutCard({
  appointment,
  confirmationPath,
}: StaffPosCheckoutCardProps) {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setShareUrl(
      typeof window !== "undefined"
        ? `${window.location.origin}${confirmationPath}`
        : "",
    );
  }, [confirmationPath]);

  const loadConfig = useCallback(async () => {
    setConfigError(null);
    try {
      const c = await fetchPaymentConfig();
      setConfig(c);
    } catch (e: unknown) {
      setConfig(null);
      setConfigError(
        e instanceof ApiError ? e.message : "Could not load payment settings.",
      );
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const copyLink = useCallback(async () => {
    if (!shareUrl || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [shareUrl]);

  const depositCents = appointment.deposit_cents;
  const priceCents = appointment.service?.price_cents ?? 0;
  const tap = config?.tap_to_pay_status ?? "foundation";
  const paymentsOn = config?.enabled === true;

  const tapBody =
    tap === "off"
      ? "In-person tap branding is off for this environment. Deposits still use the customer checkout link when Stripe is on."
      : tap === "live"
        ? "Stripe Terminal / staff-device tap is provisioned for this environment—use your reader flow when available."
        : "Customers pay on their own phone with Apple Pay, Google Pay, or card. In-person tap on your device is the next layer—this page is the foundation: share the link, keep the chair moving.";

  return (
    <Card className="border-emerald-500/25 bg-gradient-to-b from-emerald-500/[0.06] to-transparent shadow-sm dark:border-emerald-500/20 dark:from-emerald-500/[0.08]">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-lg tracking-tight">
          At the chair — payments
        </CardTitle>
        <CardDescription className="text-pretty leading-relaxed">
          Quick reference for collecting deposits without slowing the cut.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/45 bg-background/40 px-3 py-2">
            <dt className="text-xs font-medium text-muted-foreground">
              Service price
            </dt>
            <dd className="text-base font-semibold tabular-nums">
              {formatUsd(priceCents)}
            </dd>
          </div>
          <div className="rounded-lg border border-border/45 bg-background/40 px-3 py-2">
            <dt className="text-xs font-medium text-muted-foreground">
              Deposit
            </dt>
            <dd className="text-base font-semibold tabular-nums">
              {depositCents > 0 ? formatUsd(depositCents) : "—"}
            </dd>
          </div>
          <div className="rounded-lg border border-border/45 bg-background/40 px-3 py-2">
            <dt className="text-xs font-medium text-muted-foreground">
              Payment status
            </dt>
            <dd className="text-base font-semibold capitalize">
              {appointment.payment_status.replace(/_/g, " ")}
            </dd>
          </div>
        </dl>

        {configError ? (
          <p className="text-destructive" role="alert">
            {configError}
          </p>
        ) : null}

        <div className="rounded-xl border border-border/50 bg-muted/15 p-3.5 leading-relaxed">
          <p className="font-medium text-foreground">Tap to pay foundation</p>
          <p className="mt-1.5 text-muted-foreground">{tapBody}</p>
          {!paymentsOn ? (
            <p className="mt-2 text-amber-700 dark:text-amber-300">
              Stripe isn&apos;t enabled in this environment—collect the deposit
              manually or turn on keys for customer checkout.
            </p>
          ) : null}
        </div>

        {shareUrl ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              type="button"
              className="min-h-11 w-full touch-manipulation sm:w-auto sm:min-h-10"
              onClick={() => void copyLink()}
            >
              {copied ? "Copied link" : "Copy customer checkout link"}
            </Button>
            <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground sm:text-sm">
              {shareUrl}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
