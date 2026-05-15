"use client";

import { useCallback, useState } from "react";

export type OptimisticActionOptions<T> = {
  apply: () => void;
  revert: () => void;
  action: () => Promise<T>;
  busyId?: string | number | null;
};

/**
 * Runs an async action with optimistic UI — applies immediately, reverts on error.
 */
export function useOptimisticAction() {
  const [busyId, setBusyId] = useState<string | number | null>(null);

  const execute = useCallback(
    async <T,>({
      apply,
      revert,
      action,
      busyId: id = null,
    }: OptimisticActionOptions<T>): Promise<boolean> => {
      apply();
      setBusyId(id ?? null);
      try {
        await action();
        return true;
      } catch {
        revert();
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [],
  );

  const isBusy = useCallback(
    (id?: string | number | null) => {
      if (id === undefined) return busyId !== null;
      return busyId === id;
    },
    [busyId],
  );

  return { execute, busyId, isBusy };
}
