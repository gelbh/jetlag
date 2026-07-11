import type { LatLngTuple } from "../../domain/geometry/geometry";

const OPEN_METEO_ELEVATION_ENDPOINT = "https://api.open-meteo.com/v1/elevation";
const USGS_EPQS_ENDPOINT = "https://epqs.nationalmap.gov/v1/json";
const ELEVATION_BATCH_SIZE = 100;
const USGS_MIN_REQUEST_GAP_MS = 250;
const ELEVATION_CACHE_TTL_MS = 15 * 60 * 1000;
const ELEVATION_MAX_RETRIES_FOREGROUND = 6;
const ELEVATION_MAX_RETRIES_BACKGROUND = 2;
const ELEVATION_BASE_BACKOFF_MS = 1000;
const ELEVATION_MAX_BACKOFF_MS = 30_000;
const ELEVATION_MIN_429_BACKOFF_MS = 2000;
const ELEVATION_MIN_REQUEST_GAP_MS = 250;
const ELEVATION_WEIGHTED_CALLS_PER_MINUTE = 400;
const ELEVATION_MAX_CONCURRENT = 1;
const ELEVATION_CIRCUIT_BREAKER_THRESHOLD = 3;
const ELEVATION_CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000;

export type ElevationFetchProfile = "background" | "foreground";

export interface FetchElevationsOptions {
  profile?: ElevationFetchProfile;
}

interface OpenMeteoElevationResponse {
  elevation: number[];
}

interface UsgsEpqsResponse {
  value?: number | string;
}

interface CachedElevation {
  value: number;
  expiresAt: number;
}

const elevationCache = new Map<string, CachedElevation>();
let activeElevationRequests = 0;
let lastElevationRequestAt = 0;
let lastElevationBatchSize = 0;
const elevationWaitQueue: Array<() => void> = [];
let consecutive429Count = 0;
let circuitBreakerOpenUntil = 0;

export function isUsElevationPoint(point: LatLngTuple): boolean {
  const [lat, lng] = point;

  if (lat >= 24.0 && lat <= 49.5 && lng >= -125.0 && lng <= -66.0) {
    return true;
  }

  if (lat >= 51.0 && lat <= 72.0 && lng >= -180.0 && lng <= -129.0) {
    return true;
  }

  if (lat >= 18.0 && lat <= 23.0 && lng >= -161.0 && lng <= -154.0) {
    return true;
  }

  if (lat >= 17.5 && lat <= 18.6 && lng >= -67.5 && lng <= -65.0) {
    return true;
  }

  return false;
}

export function requestGapMsForBatchSize(batchSize: number): number {
  const weightedGap =
    (batchSize / ELEVATION_WEIGHTED_CALLS_PER_MINUTE) * 60_000;
  return Math.max(ELEVATION_MIN_REQUEST_GAP_MS, Math.ceil(weightedGap));
}

export function isElevationCircuitOpen(): boolean {
  return Date.now() < circuitBreakerOpenUntil;
}

function maxRetriesForProfile(profile: ElevationFetchProfile): number {
  return profile === "foreground"
    ? ELEVATION_MAX_RETRIES_FOREGROUND
    : ELEVATION_MAX_RETRIES_BACKGROUND;
}

function record429Response(): void {
  consecutive429Count += 1;
  if (consecutive429Count >= ELEVATION_CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreakerOpenUntil = Date.now() + ELEVATION_CIRCUIT_BREAKER_COOLDOWN_MS;
    consecutive429Count = 0;
  }
}

function recordSuccessfulElevationResponse(): void {
  consecutive429Count = 0;
}

function elevationCacheKey(point: LatLngTuple): string {
  return `${point[0].toFixed(5)},${point[1].toFixed(5)}`;
}

function readCachedElevation(key: string): number | undefined {
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

function writeCachedElevation(key: string, value: number): void {
  elevationCache.set(key, {
    value,
    expiresAt: Date.now() + ELEVATION_CACHE_TTL_MS,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function retryDelayMs(
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

async function waitForElevationBatchGap(): Promise<void> {
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

function markElevationRequestCompleted(batchSize: number): void {
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

async function runLimitedElevationRequest<T>(
  task: () => Promise<T>,
): Promise<T> {
  await acquireElevationSlot();
  try {
    return await task();
  } finally {
    releaseElevationSlot();
  }
}

async function fetchOpenMeteoElevationBatch(
  points: LatLngTuple[],
  profile: ElevationFetchProfile,
): Promise<number[]> {
  const maxRetries = maxRetriesForProfile(profile);
  const url = new URL(OPEN_METEO_ELEVATION_ENDPOINT);
  url.searchParams.set("latitude", points.map((point) => point[0]).join(","));
  url.searchParams.set("longitude", points.map((point) => point[1]).join(","));

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });

    if (response.ok) {
      recordSuccessfulElevationResponse();
      const payload = (await response.json()) as OpenMeteoElevationResponse;
      if (
        !Array.isArray(payload.elevation) ||
        payload.elevation.length !== points.length
      ) {
        throw new Error("Elevation lookup returned an unexpected response.");
      }

      return payload.elevation;
    }

    if (response.status === 429 && attempt < maxRetries) {
      record429Response();
      lastError = new Error(
        "Elevation lookup is temporarily rate-limited. Try again in a moment.",
      );
      await sleep(
        Math.max(
          ELEVATION_MIN_429_BACKOFF_MS,
          retryDelayMs(attempt, response.headers.get("Retry-After")),
        ),
      );
      continue;
    }

    if (response.status === 429) {
      record429Response();
      throw new Error(
        "Elevation lookup is temporarily rate-limited. Try again in a moment.",
      );
    }

    throw new Error("Elevation lookup failed.");
  }

  throw lastError ?? new Error("Elevation lookup failed.");
}

async function fetchUsgsElevation(
  point: LatLngTuple,
  profile: ElevationFetchProfile,
): Promise<number> {
  const maxRetries = maxRetriesForProfile(profile);
  const url = new URL(USGS_EPQS_ENDPOINT);
  url.searchParams.set("x", String(point[1]));
  url.searchParams.set("y", String(point[0]));
  url.searchParams.set("units", "Meters");
  url.searchParams.set("output", "json");

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });

    if (response.ok) {
      recordSuccessfulElevationResponse();
      const payload = (await response.json()) as UsgsEpqsResponse;
      const elevation = Number(payload.value);
      if (!Number.isFinite(elevation)) {
        throw new Error("Elevation lookup returned an unexpected response.");
      }

      return elevation;
    }

    if (response.status === 429 && attempt < maxRetries) {
      record429Response();
      lastError = new Error(
        "Elevation lookup is temporarily rate-limited. Try again in a moment.",
      );
      await sleep(
        Math.max(
          ELEVATION_MIN_429_BACKOFF_MS,
          retryDelayMs(attempt, response.headers.get("Retry-After")),
        ),
      );
      continue;
    }

    if (response.status === 429) {
      record429Response();
      throw new Error(
        "Elevation lookup is temporarily rate-limited. Try again in a moment.",
      );
    }

    throw new Error("Elevation lookup failed.");
  }

  throw lastError ?? new Error("Elevation lookup failed.");
}

async function fetchElevationBatch(
  points: LatLngTuple[],
  profile: ElevationFetchProfile,
): Promise<number[]> {
  const elevations: number[] = new Array(points.length);
  const openMeteoIndices: number[] = [];
  const openMeteoPoints: LatLngTuple[] = [];

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (!isUsElevationPoint(point)) {
      openMeteoIndices.push(index);
      openMeteoPoints.push(point);
      continue;
    }

    try {
      elevations[index] = await fetchUsgsElevation(point, profile);
      if (index < points.length - 1) {
        await sleep(USGS_MIN_REQUEST_GAP_MS);
      }
    } catch {
      openMeteoIndices.push(index);
      openMeteoPoints.push(point);
    }
  }

  if (openMeteoPoints.length === 0) {
    return elevations;
  }

  const openMeteoElevations = await fetchOpenMeteoElevationBatch(
    openMeteoPoints,
    profile,
  );

  for (let fallbackIndex = 0; fallbackIndex < openMeteoIndices.length; fallbackIndex += 1) {
    elevations[openMeteoIndices[fallbackIndex]] =
      openMeteoElevations[fallbackIndex];
  }

  return elevations;
}

async function fetchElevationBatchAndWrite(
  batch: Array<{ point: LatLngTuple; indices: number[] }>,
  elevations: number[],
  profile: ElevationFetchProfile,
): Promise<void> {
  await waitForElevationBatchGap();
  try {
    const batchPoints = batch.map((entry) => entry.point);
    const batchElevations = await fetchElevationBatch(batchPoints, profile);

    for (let batchIndex = 0; batchIndex < batch.length; batchIndex += 1) {
      const elevation = batchElevations[batchIndex];
      const key = elevationCacheKey(batch[batchIndex].point);
      writeCachedElevation(key, elevation);
      for (const resultIndex of batch[batchIndex].indices) {
        elevations[resultIndex] = elevation;
      }
    }
  } catch (error) {
    if (profile === "background") {
      for (const entry of batch) {
        for (const resultIndex of entry.indices) {
          elevations[resultIndex] = Number.NaN;
        }
      }
    } else {
      throw error;
    }
  } finally {
    markElevationRequestCompleted(batch.length);
  }
}

export async function fetchElevations(
  points: LatLngTuple[],
  options: FetchElevationsOptions = {},
): Promise<number[]> {
  const profile = options.profile ?? "foreground";

  if (points.length === 0) {
    return [];
  }

  const elevations: number[] = new Array(points.length);
  const pendingByKey = new Map<
    string,
    { point: LatLngTuple; indices: number[] }
  >();

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const key = elevationCacheKey(point);
    const cached = readCachedElevation(key);
    if (cached !== undefined) {
      elevations[index] = cached;
      continue;
    }

    if (isElevationCircuitOpen()) {
      elevations[index] = Number.NaN;
      continue;
    }

    const pending = pendingByKey.get(key);
    if (pending) {
      pending.indices.push(index);
      continue;
    }

    pendingByKey.set(key, { point, indices: [index] });
  }

  const pendingPoints = [...pendingByKey.values()];

  if (pendingPoints.length === 0 || isElevationCircuitOpen()) {
    return elevations;
  }

  for (
    let index = 0;
    index < pendingPoints.length;
    index += ELEVATION_BATCH_SIZE
  ) {
    const batch = pendingPoints.slice(index, index + ELEVATION_BATCH_SIZE);
    await runLimitedElevationRequest(() =>
      fetchElevationBatchAndWrite(batch, elevations, profile),
    );
  }

  return elevations;
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
