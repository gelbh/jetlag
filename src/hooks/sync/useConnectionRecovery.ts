import { disableNetwork, enableNetwork } from "firebase/firestore";
import { useEffect, useRef } from "react";
import {
  LIE_FI_UNACKED_MS,
  msUntilCycleEligible,
  shouldCycleFirestoreNetwork,
} from "@/domain/device/sync/recoveryPolicy";
import { getFirestoreDb } from "@/services/core/firebase/firebase";
import { useSessionStore } from "@/state/sessionStore";
import { selectOldestPendingAgeMs, useWriteLedgerStore } from "@/state/writeLedgerStore";

export const LIE_FI_CHECK_INTERVAL_MS = 4_000;

/**
 * Resume / lie-fi recovery for the live session.
 *
 * - Lie-fi: `navigator.onLine` says online but a tracked write has been unacked
 *   for longer than `LIE_FI_UNACKED_MS` → probe reachability now instead of
 *   waiting for the next interval tick.
 * - Stalled streams: the probe says the server is reachable but the session
 *   listener keeps serving cache → cycle Firestore's network once
 *   (`disableNetwork` → `enableNetwork`), gated and throttled by
 *   `shouldCycleFirestoreNetwork`.
 */
export function useConnectionRecovery(
  enabled: boolean,
  reachable: boolean | null,
  probeNow: () => void,
): void {
  const fromCache = useSessionStore((state) => state.sessionFromCache);
  const fromCacheSince = useRef<number | null>(null);
  const lastCycle = useRef<number | null>(null);

  useEffect(() => {
    fromCacheSince.current = fromCache ? (fromCacheSince.current ?? Date.now()) : null;
  }, [fromCache]);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      // Known-unreachable or OS-offline: the regular probe interval handles
      // recovery; fast probes here would only burn battery.
      if (reachable === false || (typeof navigator !== "undefined" && !navigator.onLine)) return;
      const age = selectOldestPendingAgeMs(useWriteLedgerStore.getState());
      if (age !== null && age > LIE_FI_UNACKED_MS) probeNow();
    }, LIE_FI_CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [enabled, reachable, probeNow]);

  useEffect(() => {
    if (!enabled || reachable !== true) return;

    let timeoutId: number | undefined;
    const evaluate = () => {
      const input = {
        reachable: true,
        fromCacheSinceMs: fromCacheSince.current,
        lastCycleAtMs: lastCycle.current,
        now: Date.now(),
      };
      if (shouldCycleFirestoreNetwork(input)) {
        lastCycle.current = input.now;
        const db = getFirestoreDb();
        void disableNetwork(db)
          .then(() => enableNetwork(db))
          .catch(() => {
            // Best effort: Firestore retries on its own; never leave it disabled.
            void enableNetwork(db).catch(() => {});
          });
        return;
      }
      // One cycle per stuck episode: once this effect run has cycled, the next
      // attempt needs a fresh reachable / fromCache transition, so a listener
      // that never recovers can't churn the network every 30 s.
      const waitMs = msUntilCycleEligible(input);
      if (waitMs !== null) timeoutId = window.setTimeout(evaluate, waitMs);
    };

    evaluate();
    return () => window.clearTimeout(timeoutId);
  }, [enabled, reachable, fromCache]);
}
