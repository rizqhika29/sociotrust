"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Double-submit audit guard.
 *
 * Every write action gets:
 * - a synchronous in-flight ref so two rapid clicks/taps can NEVER both pass
 *   (React state updates are async — a pure-state check has a race window),
 * - a mirrored state flag to disable buttons and show spinners,
 * - a monotonically increasing attempt id so a stale async continuation
 *   cannot overwrite newer state,
 * - a global refusal: while ANY tracked action is busy (e.g. challenge
 *   rotating the nonce), no other write may start.
 */
export function useTxGuard() {
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const inflightRef = useRef<string | null>(null);
  const attemptRef = useRef(0);

  const run = useCallback(
    async <T>(action: string, fn: (attempt: number) => Promise<T>): Promise<T | null> => {
      if (inflightRef.current) return null; // synchronous race-free check
      inflightRef.current = action;
      const attempt = ++attemptRef.current;
      setBusyAction(action);
      try {
        const out = await fn(attempt);
        if (attempt !== attemptRef.current) return null; // stale continuation
        return out;
      } finally {
        if (inflightRef.current === action) inflightRef.current = null;
        if (attempt === attemptRef.current) setBusyAction(null);
      }
    },
    []
  );

  const isBusy = useCallback((action: string) => busyAction === action, [busyAction]);
  const anyBusy = busyAction !== null;

  return { run, isBusy, anyBusy, busyAction };
}
