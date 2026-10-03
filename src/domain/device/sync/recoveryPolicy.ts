/** A write unacked this long while `navigator.onLine` says online is treated as lie-fi. */
export const LIE_FI_UNACKED_MS = 8_000;
/** How long the session listener may serve cache (while reachable) before we cycle. */
export const STUCK_CACHE_MS = 5_000;
/** Minimum gap between two Firestore network cycles. */
export const CYCLE_THROTTLE_MS = 30_000;

export type FirestoreCycleInput = {
  reachable: boolean;
  fromCacheSinceMs: number | null;
  lastCycleAtMs: number | null;
  now: number;
};

/**
 * Firestore's browser connectivity monitor only listens for window online/offline;
 * iOS WebView resume often fires neither, leaving streams stalled. Cycle the
 * network only when our probe says the server is reachable but the session
 * listener is still serving cache.
 */
export function shouldCycleFirestoreNetwork(input: FirestoreCycleInput): boolean {
  if (!input.reachable || input.fromCacheSinceMs === null) return false;
  if (input.now - input.fromCacheSinceMs < STUCK_CACHE_MS) return false;
  return input.lastCycleAtMs === null || input.now - input.lastCycleAtMs >= CYCLE_THROTTLE_MS;
}

/**
 * Milliseconds until `shouldCycleFirestoreNetwork` could next return true, or
 * null when it never will without an input change (unreachable / live).
 */
export function msUntilCycleEligible(input: FirestoreCycleInput): number | null {
  if (!input.reachable || input.fromCacheSinceMs === null) return null;
  const stuckAt = input.fromCacheSinceMs + STUCK_CACHE_MS;
  const throttleAt = input.lastCycleAtMs === null ? 0 : input.lastCycleAtMs + CYCLE_THROTTLE_MS;
  return Math.max(0, stuckAt - input.now, throttleAt - input.now);
}
