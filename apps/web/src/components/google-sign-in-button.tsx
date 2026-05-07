"use client";

import { getGoogleOAuthRedirectUrl } from "@ozilcuts/api";
import { Button } from "@ozilcuts/ui";

type GoogleSignInButtonProps = {
  disabled?: boolean;
};

export function GoogleSignInButton({ disabled = false }: GoogleSignInButtonProps) {
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
          ? "Set NEXT_PUBLIC_API_URL to your API origin (e.g. http://localhost:8000) to enable Google sign-in."
          : undefined
      }
      onClick={() => {
        if (href) window.location.href = href;
      }}
    >
      Continue with Google
    </Button>
  );
}
