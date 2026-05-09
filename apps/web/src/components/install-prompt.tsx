"use client";

import { Button } from "@ozilcuts/ui";
import { useState } from "react";
import { useInstallPrompt } from "@/lib/use-install-prompt";

/**
 * Floating install affordance pinned to the bottom of the viewport.
 * Visibility, platform detection and dismissal are owned by
 * `useInstallPrompt`; this component is purely the UI layer.
 *
 * - Android/Chromium: a primary "Install" button triggers the deferred
 *   `beforeinstallprompt` event captured by the hook.
 * - iOS Safari: a "Show me how" button reveals inline Add-to-Home-Screen
 *   instructions, since iOS exposes no programmatic install API.
 */
export function InstallPrompt() {
  const { isVisible, source, promptInstall, dismiss } = useInstallPrompt();
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (!isVisible || !source) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Ozil Cuts"
      className="motion-toast pointer-events-auto fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-md flex-col gap-3 rounded-xl border border-border/60 bg-card/95 p-4 text-card-foreground shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:inset-x-auto sm:right-4"
      style={{ marginBottom: "max(0px, env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-sm font-bold tracking-tight text-background"
        >
          OC
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">
            Install Ozil Cuts
          </p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            {source === "android"
              ? "Add the app to your home screen for one-tap booking and a faster, distraction-free experience."
              : "Add Ozil Cuts to your iPhone home screen for a full-screen, app-like experience."}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="motion-interactive -mr-1 -mt-1 inline-flex min-h-11 min-w-11 shrink-0 touch-manipulation items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span aria-hidden>×</span>
        </button>
      </div>

      {source === "android" ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={dismiss}
          >
            Not now
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              void promptInstall();
            }}
          >
            Install
          </Button>
        </div>
      ) : (
        <>
          {showIosHelp ? (
            <ol className="ml-5 list-decimal space-y-1 text-xs leading-snug text-muted-foreground">
              <li>
                Tap the <span className="font-medium">Share</span> button at
                the bottom of Safari.
              </li>
              <li>
                Choose <span className="font-medium">Add to Home Screen</span>.
              </li>
              <li>
                Tap <span className="font-medium">Add</span> in the top right
                to finish.
              </li>
            </ol>
          ) : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={dismiss}
            >
              Not now
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (showIosHelp) {
                  dismiss();
                } else {
                  setShowIosHelp(true);
                }
              }}
              aria-expanded={showIosHelp}
            >
              {showIosHelp ? "Got it" : "Show me how"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
