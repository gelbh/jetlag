import { useSyncExternalStore } from "react";

/** Host STUCK? cue and host stale auto-cancel share this tick. */
export const STALE_WALK_CLOCK_MS = 15_000;

let staleWalkNowMs = 0;
let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function ensureInterval(): void {
  if (intervalId !== null) {
    return;
  }
  if (staleWalkNowMs === 0) {
    staleWalkNowMs = Date.now();
  }
  intervalId = window.setInterval(() => {
    staleWalkNowMs = Date.now();
    for (const listener of listeners) {
      listener();
    }
  }, STALE_WALK_CLOCK_MS);
}

function subscribeStaleWalkClock(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  ensureInterval();
  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0 && intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
      staleWalkNowMs = 0;
    }
  };
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
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
  listeners.clear();
  staleWalkNowMs = 0;
}
