"use client";

import { stashAuthNextPath } from "@/lib/auth-redirect";
import { safeNextPath } from "@/lib/safe-next-path";
import { getGoogleOAuthRedirectUrl } from "@ozilcuts/api";
import { Button } from "@ozilcuts/ui";

type GoogleSignInButtonProps = {
  disabled?: boolean;
  /** Post-auth return path (`?next=` on login/register). */
  returnPath?: string | null;
};

export function GoogleSignInButton({
  disabled = false,
  returnPath = null,
}: GoogleSignInButtonProps) {
  const href = getGoogleOAuthRedirectUrl();
  const unavailable = !href;

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
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
