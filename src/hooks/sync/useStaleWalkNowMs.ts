import { useSyncExternalStore } from "react";

/** Host STUCK? cue and seeker auto-cancel share this tick so time alone can cross thresholds. */
export const STALE_WALK_CLOCK_MS = 15_000;

let staleWalkNowMs = 0;

function subscribeStaleWalkClock(onStoreChange: () => void): () => void {
  if (staleWalkNowMs === 0) {
    staleWalkNowMs = Date.now();
  }
  const id = window.setInterval(() => {
    staleWalkNowMs = Date.now();
    onStoreChange();
  }, STALE_WALK_CLOCK_MS);
  return () => window.clearInterval(id);
}

function getStaleWalkNowMs(): number {
  if (staleWalkNowMs === 0) {
    staleWalkNowMs = Date.now();
  }
  return staleWalkNowMs;
}

export function useStaleWalkNowMs(): number {
  return useSyncExternalStore(
    subscribeStaleWalkClock,
    getStaleWalkNowMs,
    () => 0,
  );
}

/** Test helper — reset module clock between suites if needed. */
export function resetStaleWalkClockForTests(): void {
  staleWalkNowMs = 0;
}
