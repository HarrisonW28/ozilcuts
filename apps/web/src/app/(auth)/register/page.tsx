"use client";

import { ApiValidationError, registerUser } from "@ozilcuts/api";
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
  buttonVariants,
  cn,
} from "@ozilcuts/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { setStoredAuthToken } from "@/lib/auth-token";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFormError(null);
    setFieldErrors({});
    try {
      const { token } = await registerUser({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      setStoredAuthToken(token);
      router.push("/");
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
            <Label htmlFor="password_confirmation">Confirm password</Label>
            <Input
              id="password_confirmation"
              name="password_confirmation"
              type="password"
              autoComplete="new-password"
              required
              value={passwordConfirmation}
              onChange={(ev) => setPasswordConfirmation(ev.target.value)}
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
        <GoogleSignInButton disabled={loading} />
      </CardContent>
      <CardFooter className="flex flex-col gap-2 text-center text-sm text-muted-foreground sm:flex-row sm:justify-center">
        <span>Already registered?</span>
        <Link
          href="/login"
          className={cn(
            buttonVariants({ variant: "link" }),
            "h-auto min-h-0 px-0",
          )}
        >
          Sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
