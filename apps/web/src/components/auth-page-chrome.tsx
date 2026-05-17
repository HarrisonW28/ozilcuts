"use client";

import { authPathWithNext } from "@/lib/auth-redirect";
import { SiteBrandMark } from "@/components/site-brand-mark";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

type AuthPageChromeProps = {
  children: ReactNode;
};

/**
 * Sign-in / register shell: brand link home and return path preserved on register ↔ login.
 */
export function AuthPageChrome({ children }: AuthPageChromeProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const returnPath =
    pathname === "/login" || pathname === "/register"
      ? nextParam
      : pathname;

  const loginHref = authPathWithNext("/login", returnPath);
  const registerHref = authPathWithNext("/register", returnPath);
  const onLogin = pathname === "/login";
  const onRegister = pathname === "/register";

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="motion-interactive inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-medium text-muted-foreground touch-manipulation hover:text-foreground"
        >
          <ChevronLeft className="size-4 shrink-0" aria-hidden />
          Home
        </Link>
        <Link
          href="/"
          aria-label="Home"
          className="motion-interactive shrink-0 rounded-md px-1 py-1 touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
        >
          <SiteBrandMark variant="shell" />
        </Link>
      </div>

      {children}

      {onLogin || onRegister ? (
        <p className="text-center text-sm text-muted-foreground">
          {onLogin ? (
            <>
              No account?{" "}
              <Link
                href={registerHref}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Create one
              </Link>
            </>
          ) : (
            <>
              Already registered?{" "}
              <Link
                href={loginHref}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}
