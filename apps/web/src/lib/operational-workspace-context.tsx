"use client";

import {
  OPERATIONAL_WORKSPACE_STORAGE_KEY,
  type OperationalWorkspaceMode,
  readOperationalWorkspaceMode,
  writeOperationalWorkspaceMode,
} from "@/lib/operational-workspace-mode";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type OperationalWorkspaceContextValue = {
  mode: OperationalWorkspaceMode;
  setMode: (mode: OperationalWorkspaceMode) => void;
  isFocused: boolean;
};

const OperationalWorkspaceContext =
  createContext<OperationalWorkspaceContextValue | null>(null);

export function OperationalWorkspaceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [mode, setModeState] = useState<OperationalWorkspaceMode>("focused");

  useEffect(() => {
    setModeState(readOperationalWorkspaceMode());

    function onStorage(ev: StorageEvent) {
      if (
        ev.key !== OPERATIONAL_WORKSPACE_STORAGE_KEY ||
        ev.newValue === null
      ) {
        return;
      }
      setModeState(
        ev.newValue === "full" || ev.newValue === "focused"
          ? ev.newValue
          : "focused",
      );
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setMode = useCallback((next: OperationalWorkspaceMode) => {
    setModeState(next);
    writeOperationalWorkspaceMode(next);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      isFocused: mode === "focused",
    }),
    [mode, setMode],
  );

  return (
    <OperationalWorkspaceContext.Provider value={value}>
      {children}
    </OperationalWorkspaceContext.Provider>
  );
}

export function useOperationalWorkspaceMode(): OperationalWorkspaceContextValue {
  const ctx = useContext(OperationalWorkspaceContext);
  if (ctx === null) {
    throw new Error(
      "useOperationalWorkspaceMode must be used within OperationalWorkspaceProvider",
    );
  }
  return ctx;
}
