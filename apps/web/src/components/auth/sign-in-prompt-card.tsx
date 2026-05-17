"use client";

import { authPathWithNext } from "@/lib/auth-redirect";
import { AUTH_COPY } from "@/lib/user-facing-copy";
import {
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@ozilcuts/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

type SignInPromptCardProps = {
  title?: string;
  description?: string;
  /** Override return path after sign-in (defaults to current path). */
  returnTo?: string;
  className?: string;
};

export function SignInPromptCard({
  title = AUTH_COPY.signInRequiredTitle,
  description = AUTH_COPY.signInRequiredDescription,
  returnTo,
  className,
}: SignInPromptCardProps) {
  const pathname = usePathname();
  const next = returnTo ?? pathname;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={authPathWithNext("/login", next)}>Sign in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={authPathWithNext("/register", next)}>Create account</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
