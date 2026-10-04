import { useEffect, useRef } from "react";
import {
  LIE_FI_CHECK_INTERVAL_MS,
  LIE_FI_UNACKED_MS,
  msUntilCycleEligible,
  shouldCycleFirestoreNetwork,
} from "@/domain/device/sync/recoveryPolicy";
import { isEffectivelyOffline } from "@/domain/device/sync/sync";
import { cycleFirestoreNetwork } from "@/services/firestore/networkCycle";
import { useSessionStore } from "@/state/sessionStore";
import { selectOldestPendingAgeMs, useWriteLedgerStore } from "@/state/writeLedgerStore";

/**
 * Resume / lie-fi recovery for the live session.
 *
 * - Lie-fi: `navigator.onLine` says online but a tracked write has been unacked
 *   for longer than `LIE_FI_UNACKED_MS` → probe reachability now instead of
 *   waiting for the next interval tick.
 * - Stalled streams: the probe says the server is reachable but the session
 *   listener keeps serving cache → cycle Firestore's network, gated and
 *   throttled by `shouldCycleFirestoreNetwork`.
 */
export function useConnectionRecovery(
  enabled: boolean,
  reachable: boolean | null,
  probeNow: () => void,
): void {
  const fromCache = useSessionStore((state) => state.sessionFromCache);
  const fromCacheSince = useRef<number | null>(null);
  const lastCycle = useRef<number | null>(null);

  // Must stay declared before the cycle effect: both run on `fromCache`
  // changes and the cycle effect reads the timestamp written here.
  useEffect(() => {
    fromCacheSince.current = fromCache ? (fromCacheSince.current ?? Date.now()) : null;
  }, [fromCache]);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      // Known-unreachable or OS-offline: the regular probe interval handles
      // recovery; fast probes here would only burn battery.
      const online = typeof navigator === "undefined" ? true : navigator.onLine;
      if (isEffectivelyOffline({ online, reachable })) return;
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
        void cycleFirestoreNetwork();
        // No reschedule after a cycle: another attempt needs a fresh
        // reachable / fromCache transition, so a listener that never recovers
        // can't churn the network every 30 s.
        return;
      }
      const waitMs = msUntilCycleEligible(input);
      if (waitMs !== null) timeoutId = window.setTimeout(evaluate, waitMs);
    };

    evaluate();
    return () => window.clearTimeout(timeoutId);
  }, [enabled, reachable, fromCache]);
}
