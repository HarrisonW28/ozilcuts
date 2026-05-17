"use client";

import { cn } from "@ozilcuts/ui";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type AppToastVariant = "success" | "error" | "info";

type AppToastItem = {
  id: string;
  message: string;
  variant: AppToastVariant;
};

type AppToastContextValue = {
  toast: (message: string, variant?: AppToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const AppToastContext = createContext<AppToastContextValue | null>(null);

const TOAST_MS = 6500;

function variantStyles(variant: AppToastVariant): string {
  switch (variant) {
    case "success":
      return "border-emerald-500/35 bg-background/95 text-foreground dark:border-emerald-500/30";
    case "error":
      return "border-destructive/45 bg-background/95 text-foreground dark:border-destructive/40";
    default:
      return "border-border/60 bg-background/95 text-foreground";
  }
}

export function AppToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<AppToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: AppToastVariant = "info") => {
      const trimmed = message.trim();
      if (!trimmed) return;

      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      setItems((prev) => [...prev.slice(-4), { id, message: trimmed, variant }]);

      const timer = setTimeout(() => dismiss(id), TOAST_MS);
      timersRef.current.set(id, timer);
    },
    [dismiss],
  );

  const value = useMemo<AppToastContextValue>(
    () => ({
      toast,
      success: (message) => toast(message, "success"),
      error: (message) => toast(message, "error"),
      info: (message) => toast(message, "info"),
    }),
    [toast],
  );

  return (
    <AppToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed right-4 z-40 flex w-[min(100vw-2rem,22rem)] flex-col gap-2 sm:right-5"
        style={{
          top: "calc(var(--site-header-offset, 4.75rem) + 0.75rem)",
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            role={item.variant === "error" ? "alert" : "status"}
            className={cn(
              "motion-toast pointer-events-auto rounded-xl border px-4 py-3 text-sm leading-snug shadow-xl backdrop-blur-md",
              variantStyles(item.variant),
            )}
          >
            <p>{item.message}</p>
            <button
              type="button"
              className="mt-2 text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => dismiss(item.id)}
            >
              Dismiss
            </button>
            </div>
        ))}
      </div>
    </AppToastContext.Provider>
  );
}

export function useAppToast(): AppToastContextValue {
  const ctx = useContext(AppToastContext);
  if (!ctx) {
    throw new Error("useAppToast must be used within AppToastProvider");
  }
  return ctx;
}
