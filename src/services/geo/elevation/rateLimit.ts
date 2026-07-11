import type { LatLngTuple } from "../../../domain/geometry/geometry";
import {
  ELEVATION_BASE_BACKOFF_MS,
  ELEVATION_CACHE_TTL_MS,
  ELEVATION_CIRCUIT_BREAKER_COOLDOWN_MS,
  ELEVATION_CIRCUIT_BREAKER_THRESHOLD,
  ELEVATION_MAX_BACKOFF_MS,
  ELEVATION_MAX_CONCURRENT,
  ELEVATION_MAX_RETRIES_BACKGROUND,
  ELEVATION_MAX_RETRIES_FOREGROUND,
  ELEVATION_MIN_REQUEST_GAP_MS,
  ELEVATION_WEIGHTED_CALLS_PER_MINUTE,
  type CachedElevation,
  type ElevationFetchProfile,
} from "./constants";

const elevationCache = new Map<string, CachedElevation>();
let activeElevationRequests = 0;
let lastElevationRequestAt = 0;
let lastElevationBatchSize = 0;
const elevationWaitQueue: Array<() => void> = [];
let consecutive429Count = 0;
let circuitBreakerOpenUntil = 0;

export function requestGapMsForBatchSize(batchSize: number): number {
  const weightedGap =
    (batchSize / ELEVATION_WEIGHTED_CALLS_PER_MINUTE) * 60_000;
  return Math.max(ELEVATION_MIN_REQUEST_GAP_MS, Math.ceil(weightedGap));
}

export function isElevationCircuitOpen(): boolean {
  return Date.now() < circuitBreakerOpenUntil;
}

export function maxRetriesForProfile(profile: ElevationFetchProfile): number {
  return profile === "foreground"
    ? ELEVATION_MAX_RETRIES_FOREGROUND
    : ELEVATION_MAX_RETRIES_BACKGROUND;
}

export function record429Response(): void {
  consecutive429Count += 1;
  if (consecutive429Count >= ELEVATION_CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreakerOpenUntil = Date.now() + ELEVATION_CIRCUIT_BREAKER_COOLDOWN_MS;
    consecutive429Count = 0;
  }
}

export function recordSuccessfulElevationResponse(): void {
  consecutive429Count = 0;
}

export function elevationCacheKey(point: LatLngTuple): string {
  return `${point[0].toFixed(5)},${point[1].toFixed(5)}`;
}

export function readCachedElevation(key: string): number | undefined {
  const cached = elevationCache.get(key);
  if (!cached) {
    return undefined;
  }

  if (cached.expiresAt <= Date.now()) {
    elevationCache.delete(key);
    return undefined;
  }

  return cached.value;
}

export function writeCachedElevation(key: string, value: number): void {
  elevationCache.set(key, {
    value,
    expiresAt: Date.now() + ELEVATION_CACHE_TTL_MS,
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function retryDelayMs(
  attempt: number,
  retryAfterHeader: string | null,
): number {
  if (retryAfterHeader) {
    const retryAfterSeconds = Number.parseInt(retryAfterHeader, 10);
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      return Math.min(
        ELEVATION_MAX_BACKOFF_MS,
        retryAfterSeconds * 1000,
      );
    }
  }

  return Math.min(
    ELEVATION_MAX_BACKOFF_MS,
    ELEVATION_BASE_BACKOFF_MS * 2 ** attempt,
  );
}

export async function waitForElevationBatchGap(): Promise<void> {
  if (lastElevationRequestAt === 0) {
    return;
  }

  const requiredGap = requestGapMsForBatchSize(lastElevationBatchSize);
  const elapsed = Date.now() - lastElevationRequestAt;
  const remaining = requiredGap - elapsed;
  if (remaining > 0) {
    await sleep(remaining);
  }
}

export function markElevationRequestCompleted(batchSize: number): void {
  lastElevationRequestAt = Date.now();
  lastElevationBatchSize = batchSize;
}

async function acquireElevationSlot(): Promise<void> {
  if (activeElevationRequests < ELEVATION_MAX_CONCURRENT) {
    activeElevationRequests += 1;
    return;
  }

  await new Promise<void>((resolve) => {
    elevationWaitQueue.push(() => {
      activeElevationRequests += 1;
      resolve();
    });
  });
}

function releaseElevationSlot(): void {
  activeElevationRequests -= 1;
  const next = elevationWaitQueue.shift();
  if (next) {
    next();
  }
}

export async function runLimitedElevationRequest<T>(
  task: () => Promise<T>,
): Promise<T> {
  await acquireElevationSlot();
  try {
    return await task();
  } finally {
    releaseElevationSlot();
  }
}

export function clearElevationCacheForTests(): void {
  elevationCache.clear();
  activeElevationRequests = 0;
  lastElevationRequestAt = 0;
  lastElevationBatchSize = 0;
  elevationWaitQueue.length = 0;
  consecutive429Count = 0;
  circuitBreakerOpenUntil = 0;
}

export function openElevationCircuitForTests(untilMs = Date.now() + 60_000): void {
  circuitBreakerOpenUntil = untilMs;
}
