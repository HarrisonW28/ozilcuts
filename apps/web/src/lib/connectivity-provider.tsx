"use client";

import { getStoredAuthToken } from "@/lib/auth-token";
import { flushThreadOutbox } from "@/lib/thread-message-outbox";
import { cn } from "@ozilcuts/ui";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type NetInfo = EventTarget & {
  effectiveType?: string;
  saveData?: boolean;
  rtt?: number;
  addEventListener?: (
    type: string,
    listener: EventListenerOrEventListenerObject,
  ) => void;
  removeEventListener?: (
    type: string,
    listener: EventListenerOrEventListenerObject,
  ) => void;
};

export type ConnectivityContextValue = {
  online: boolean;
  /** Likely constrained network while still technically online. */
  slowConnection: boolean;
};

const ConnectivityContext = createContext<ConnectivityContextValue | null>(
  null,
);

function ConnectivityRibbon({ online, slowConnection }: ConnectivityContextValue) {
  if (!online) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "connectivity-ribbon border-b border-border/60 bg-muted/95 px-3 py-2 text-center text-caption font-medium text-foreground shadow-sm backdrop-blur-md",
          "dark:border-border/45 dark:bg-background/92",
        )}
      >
        You&rsquo;re offline · saved visits and threads stay readable · queued
        messages send when you reconnect.
      </div>
    );
  }

  if (slowConnection) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "connectivity-ribbon border-b border-amber-500/35 bg-amber-500/[0.12] px-3 py-2 text-center text-caption font-medium text-amber-950 dark:text-amber-50",
          "dark:border-amber-400/35 dark:bg-amber-500/[0.14]",
        )}
      >
        Weak signal · requests may take longer. You can keep typing — we queue
        sends if the network drops.
      </div>
    );
  }

  return null;
}

export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine !== false,
  );
  const [slowConnection, setSlowConnection] = useState(false);

  useEffect(() => {
    const updateConnectionHints = () => {
      const conn = (
        navigator as Navigator & { connection?: NetInfo }
      ).connection;
      const saveData = Boolean(conn?.saveData);
      const eff = conn?.effectiveType ?? "";
      const rtt = typeof conn?.rtt === "number" ? conn.rtt : undefined;
      const slow =
        saveData ||
        eff === "slow-2g" ||
        eff === "2g" ||
        (typeof rtt === "number" && rtt >= 900);
      setSlowConnection(Boolean(slow));
    };

    updateConnectionHints();

    const conn = (navigator as Navigator & { connection?: NetInfo }).connection;
    const onConnChange = () => updateConnectionHints();
    conn?.addEventListener?.("change", onConnChange);

    const onOffline = () => setOnline(false);
    const onOnline = async () => {
      setOnline(true);
      const token = getStoredAuthToken();
      if (token) {
        await flushThreadOutbox(token);
      }
    };

    setOnline(navigator.onLine !== false);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    const bootstrapToken = getStoredAuthToken();
    if (bootstrapToken && navigator.onLine !== false) {
      void flushThreadOutbox(bootstrapToken);
    }

    return () => {
      conn?.removeEventListener?.("change", onConnChange);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const value = useMemo(
    () => ({
      online,
      slowConnection: online && slowConnection,
    }),
    [online, slowConnection],
  );

  return (
    <ConnectivityContext.Provider value={value}>
      <div className="connectivity-shell-root flex min-h-0 min-w-0 flex-1 flex-col">
        <ConnectivityRibbon online={value.online} slowConnection={value.slowConnection} />
        {children}
      </div>
    </ConnectivityContext.Provider>
  );
}

export function useConnectivity(): ConnectivityContextValue {
  const ctx = useContext(ConnectivityContext);
  if (!ctx) {
    throw new Error("useConnectivity must be used within ConnectivityProvider");
  }
  return ctx;
}
