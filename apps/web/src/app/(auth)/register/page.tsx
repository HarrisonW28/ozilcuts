"use client";

import { ApiValidationError, registerUser } from "@ozilcuts/api";
import {
  applyAuthSession,
  resolvePostAuthPath,
} from "@/lib/auth-redirect";
import { useSessionProfile } from "@/lib/use-session-profile";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@ozilcuts/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { PrivacyConsentFields } from "@/components/privacy";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useSessionProfile();
  const nextParam = searchParams.get("next");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile.kind !== "ready") return;
    router.replace(resolvePostAuthPath(nextParam, profile.user));
  }, [profile, nextParam, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFormError(null);
    setFieldErrors({});
    try {
      const { token, user } = await registerUser({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
        accept_terms: acceptTerms,
        accept_privacy: acceptPrivacy,
        marketing_opt_in: marketingOptIn,
      });
      applyAuthSession(token, user);
      const destination = resolvePostAuthPath(nextParam, user);
      router.replace(destination);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiValidationError) {
        const fe = err.fieldErrors();
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(fe)) {
          if (v[0]) flat[k] = v[0];
        }
        setFieldErrors(flat);
        setFormError(err.firstMessage() ?? "Unable to register.");
      } else {
        setFormError("Something went wrong. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (profile.kind === "ready") {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-sm text-muted-foreground" role="status">
            You&apos;re already signed in. Taking you to your account…
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>
          Register with your email. You will be signed in automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              aria-invalid={fieldErrors.name ? true : undefined}
            />
            {fieldErrors.name ? (
              <p className="text-sm text-destructive">{fieldErrors.name}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              aria-invalid={fieldErrors.email ? true : undefined}
            />
            {fieldErrors.email ? (
              <p className="text-sm text-destructive">{fieldErrors.email}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              aria-invalid={fieldErrors.password ? true : undefined}
            />
            {fieldErrors.password ? (
              <p className="text-sm text-destructive">{fieldErrors.password}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password_confirmation">
              Confirm password
            </Label>
            <Input
              id="password_confirmation"
              name="password_confirmation"
              type="password"
              autoComplete="new-password"
              required
              value={passwordConfirmation}
              onChange={(ev) =>
                setPasswordConfirmation(ev.target.value)
              }
              aria-invalid={
                fieldErrors.password_confirmation ? true : undefined
              }
            />
            {fieldErrors.password_confirmation ? (
              <p className="text-sm text-destructive">
                {fieldErrors.password_confirmation}
              </p>
            ) : null}
          </div>
          <PrivacyConsentFields
            acceptTerms={acceptTerms}
            acceptPrivacy={acceptPrivacy}
            marketingOptIn={marketingOptIn}
            onAcceptTermsChange={setAcceptTerms}
            onAcceptPrivacyChange={setAcceptPrivacy}
            onMarketingOptInChange={setMarketingOptIn}
            fieldErrors={fieldErrors}
          />
          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <div className="relative my-4" aria-hidden>
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or</span>
          </div>
        </div>
        <GoogleSignInButton disabled={loading} returnPath={nextParam} />
      </CardContent>
    </Card>
  );
}

function RegisterFormFallback() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Loading…</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground" aria-busy="true">
          Loading…
        </p>
      </CardContent>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFormFallback />}>
      <RegisterForm />
    </Suspense>
  );
}
