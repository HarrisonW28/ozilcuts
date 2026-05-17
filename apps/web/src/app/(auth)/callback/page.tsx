"use client";

import {
  applyAuthSession,
  resolvePostAuthPath,
  takeStashedAuthNextPath,
} from "@/lib/auth-redirect";
import { fetchCurrentUser } from "@ozilcuts/api";
import { setStoredAuthToken } from "@/lib/auth-token";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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

    const stashedNext = takeStashedAuthNextPath();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );

    void (async () => {
      try {
        const user = await fetchCurrentUser(token);
        applyAuthSession(token, user);
        router.replace(resolvePostAuthPath(stashedNext, user));
        router.refresh();
      } catch {
        setStoredAuthToken(token);
        router.replace(stashedNext ?? "/home");
        router.refresh();
      }
    })();
  }, [router]);

  if (phase === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not sign in</CardTitle>
          <CardDescription>{oauthErrorMessage(errorCode)}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Home</Link>
          </Button>
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
