import type { GeolocationReading } from "./geolocation";

/** Align with low-accuracy getCurrentPosition maximumAge default. */
export const LIVE_LOCATION_FRESH_MS = 30_000;

export type LiveLocationReadingSnapshot = {
  reading: GeolocationReading | null;
  updatedAtMs: number | null;
};

let snapshot: LiveLocationReadingSnapshot = {
  reading: null,
  updatedAtMs: null,
};
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getLiveLocationReadingSnapshot(): LiveLocationReadingSnapshot {
  return snapshot;
}

export function subscribeLiveLocationReading(
  onStoreChange: () => void,
): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function publishLiveLocationReading(
  reading: GeolocationReading,
  nowMs: number = Date.now(),
): void {
  snapshot = { reading, updatedAtMs: nowMs };
  emit();
}

export function clearLiveLocationReading(): void {
  if (snapshot.reading === null && snapshot.updatedAtMs === null) {
    return;
  }
  snapshot = { reading: null, updatedAtMs: null };
  emit();
}

export function getFreshLiveLocationReading(
  nowMs: number = Date.now(),
): GeolocationReading | null {
  const { reading, updatedAtMs } = snapshot;
  if (!reading || updatedAtMs === null) {
    return null;
  }
  if (nowMs - updatedAtMs > LIVE_LOCATION_FRESH_MS) {
    return null;
  }
  return reading;
}

export function resetLiveLocationReadingForTests(): void {
  snapshot = { reading: null, updatedAtMs: null };
  listeners.clear();
}
