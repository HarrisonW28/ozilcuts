"use client";

import { stashAuthNextPath } from "@/lib/auth-redirect";
import { safeNextPath } from "@/lib/safe-next-path";
import { getGoogleOAuthRedirectUrl } from "@ozilcuts/api";
import { Button, cn } from "@ozilcuts/ui";

type GoogleSignInButtonProps = {
  disabled?: boolean;
  /** Post-auth return path (`?next=` on login/register). */
  returnPath?: string | null;
  /** Gold-outline styling for the marketing hero. */
  variant?: "default" | "hero";
};

export function GoogleSignInButton({
  disabled = false,
  returnPath = null,
  variant = "default",
}: GoogleSignInButtonProps) {
  const href = getGoogleOAuthRedirectUrl();
  const unavailable = !href;
  const isHero = variant === "hero";

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "w-full",
        isHero && "home-hero-cta h-12 sm:h-[3.25rem] text-base sm:text-[1.0625rem]",
      )}
      disabled={disabled || unavailable}
      title={
        unavailable
          ? "Google sign-in is not available right now. Use email and password instead."
          : undefined
      }
      onClick={() => {
        if (!href) return;
        stashAuthNextPath(safeNextPath(returnPath));
        window.location.href = href;
      }}
    >
      Continue with Google
    </Button>
  );
}
