"use client";

import { Button } from "@ozilcuts/ui";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";

type DepositPaymentProps = {
  clientSecret: string;
  publishableKey: string;
  amountLabel: string;
  onSucceeded: () => void;
  onCancel?: () => void;
};

const stripeCache = new Map<string, Promise<Stripe | null>>();

function getStripeFor(publishableKey: string): Promise<Stripe | null> {
  let promise = stripeCache.get(publishableKey);
  if (!promise) {
    promise = loadStripe(publishableKey);
    stripeCache.set(publishableKey, promise);
  }

  return promise;
}

function PaymentForm({
  amountLabel,
  onSucceeded,
  onCancel,
}: Omit<DepositPaymentProps, "clientSecret" | "publishableKey">) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "Card details are incomplete.");
      setBusy(false);

      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url:
          typeof window !== "undefined" ? `${window.location.origin}/appointments` : "",
      },
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed. Please try again.");
      setBusy(false);

      return;
    }

    if (
      paymentIntent &&
      (paymentIntent.status === "succeeded" ||
        paymentIntent.status === "processing")
    ) {
      onSucceeded();
      return;
    }

    setBusy(false);
    setError("Payment did not complete. Please retry.");
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <PaymentElement />
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          type="submit"
          disabled={busy || !stripe || !elements}
          className="min-h-11 w-full touch-manipulation sm:w-auto sm:min-h-10"
        >
          {busy ? "Processing…" : `Pay ${amountLabel}`}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            className="min-h-11 w-full touch-manipulation sm:w-auto sm:min-h-10"
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function DepositPayment({
  clientSecret,
  publishableKey,
  amountLabel,
  onSucceeded,
  onCancel,
}: DepositPaymentProps) {
  const { resolvedTheme } = useTheme();
  const stripePromise = useMemo(
    () => getStripeFor(publishableKey),
    [publishableKey],
  );
  const elementsAppearance = useMemo(
    () => ({
      theme: resolvedTheme === "dark" ? ("night" as const) : ("stripe" as const),
    }),
    [resolvedTheme],
  );
  const [stripeReady, setStripeReady] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    stripePromise.then((res) => {
      if (cancelled) return;
      setStripeReady(res !== null);
    });
    return () => {
      cancelled = true;
    };
  }, [stripePromise]);

  if (stripeReady === false) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Stripe failed to load. Refresh and try again.
      </p>
    );
  }

  return (
    <Elements
      key={resolvedTheme ?? "light"}
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: elementsAppearance,
      }}
    >
      <PaymentForm
        amountLabel={amountLabel}
        onSucceeded={onSucceeded}
        onCancel={onCancel}
      />
    </Elements>
  );
}
