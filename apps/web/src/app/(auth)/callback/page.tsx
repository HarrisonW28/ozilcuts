"use client";

import { setStoredAuthToken } from "@/lib/auth-token";
import {
  buttonVariants,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function parseHashParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const raw = window.location.hash.replace(/^#/, "");

  return Object.fromEntries(new URLSearchParams(raw).entries());
}

function oauthErrorMessage(code: string | null): string {
  switch (code) {
    case "account_conflict":
      return "This email is already used with a different Google account. Sign in with email or the Google account you linked.";
    case "oauth_state":
    case "oauth_failed":
      return "Google sign-in could not be completed. Try again.";
    case "missing_token":
      return "No sign-in token was returned. Try signing in again.";
    default:
      return "Something went wrong. Try again.";
  }
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"working" | "error">("working");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    const params = parseHashParams();
    const err = params.error ?? null;
    if (err) {
      setErrorCode(err);
      setPhase("error");
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );

      return;
    }
    const token = params.token;
    if (!token) {
      setErrorCode("missing_token");
      setPhase("error");
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );

      return;
    }
    setStoredAuthToken(token);
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
    router.replace("/");
    router.refresh();
  }, [router]);

  if (phase === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not sign in</CardTitle>
          <CardDescription>{oauthErrorMessage(errorCode)}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/login"
            className={cn(buttonVariants(), "w-full")}
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <p
          className="text-center text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          Completing sign-in…
        </p>
      </CardContent>
    </Card>
  );
}
