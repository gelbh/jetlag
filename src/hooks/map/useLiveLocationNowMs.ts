import { useSyncExternalStore } from "react";
import { LIVE_LOCATION_FRESHNESS_TICK_MS } from "../../domain/session/live/liveLocationFreshness";

let nowMs = 0;
let intervalId: number | null = null;
const listeners = new Set<() => void>();

function ensureInterval(): void {
  if (intervalId !== null) {
    return;
  }
  if (nowMs === 0) {
    nowMs = Date.now();
  }
  intervalId = window.setInterval(() => {
    nowMs = Date.now();
    for (const listener of listeners) {
      listener();
    }
  }, LIVE_LOCATION_FRESHNESS_TICK_MS);
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  ensureInterval();
  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0 && intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
      nowMs = 0;
    }
  };
}

function getSnapshot(): number {
  if (nowMs === 0) {
    nowMs = Date.now();
  }
  return nowMs;
}

/** Shared 15s clock for all live location layers on a map. */
export function useLiveLocationNowMs(): number {
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
