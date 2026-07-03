import type { LatLngTuple } from "../domain/geometry";

const OPEN_METEO_ELEVATION_ENDPOINT = "https://api.open-meteo.com/v1/elevation";
const ELEVATION_BATCH_SIZE = 100;
const ELEVATION_CACHE_TTL_MS = 15 * 60 * 1000;
const ELEVATION_MAX_RETRIES = 4;
const ELEVATION_BASE_BACKOFF_MS = 500;
const ELEVATION_MAX_CONCURRENT = 3;

interface OpenMeteoElevationResponse {
  elevation: number[];
}

interface CachedElevation {
  value: number;
  expiresAt: number;
}

const elevationCache = new Map<string, CachedElevation>();
let activeElevationRequests = 0;
const elevationWaitQueue: Array<() => void> = [];

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
      return retryAfterSeconds * 1000;
    }
  }

  return ELEVATION_BASE_BACKOFF_MS * 2 ** attempt;
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

async function fetchElevationBatch(points: LatLngTuple[]): Promise<number[]> {
  const url = new URL(OPEN_METEO_ELEVATION_ENDPOINT);
  url.searchParams.set("latitude", points.map((point) => point[0]).join(","));
  url.searchParams.set("longitude", points.map((point) => point[1]).join(","));

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= ELEVATION_MAX_RETRIES; attempt += 1) {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });

    if (response.ok) {
      const payload = (await response.json()) as OpenMeteoElevationResponse;
      if (
        !Array.isArray(payload.elevation) ||
        payload.elevation.length !== points.length
      ) {
        throw new Error("Elevation lookup returned an unexpected response.");
      }

      return payload.elevation;
    }

    if (response.status === 429 && attempt < ELEVATION_MAX_RETRIES) {
      lastError = new Error(
        "Elevation lookup is temporarily rate-limited. Try again in a moment.",
      );
      await sleep(retryDelayMs(attempt, response.headers.get("Retry-After")));
      continue;
    }

    if (response.status === 429) {
      throw new Error(
        "Elevation lookup is temporarily rate-limited. Try again in a moment.",
      );
    }

    throw new Error("Elevation lookup failed.");
  }

  throw lastError ?? new Error("Elevation lookup failed.");
}

export async function fetchElevations(
  points: LatLngTuple[],
): Promise<number[]> {
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

    const pending = pendingByKey.get(key);
    if (pending) {
      pending.indices.push(index);
      continue;
    }

    pendingByKey.set(key, { point, indices: [index] });
  }

  const pendingPoints = [...pendingByKey.values()];
  const batchTasks: Promise<void>[] = [];

  for (
    let index = 0;
    index < pendingPoints.length;
    index += ELEVATION_BATCH_SIZE
  ) {
    const batch = pendingPoints.slice(index, index + ELEVATION_BATCH_SIZE);
    batchTasks.push(
      runLimitedElevationRequest(async () => {
        const batchPoints = batch.map((entry) => entry.point);
        const batchElevations = await fetchElevationBatch(batchPoints);

        for (let batchIndex = 0; batchIndex < batch.length; batchIndex += 1) {
          const elevation = batchElevations[batchIndex];
          const key = elevationCacheKey(batch[batchIndex].point);
          writeCachedElevation(key, elevation);
          for (const resultIndex of batch[batchIndex].indices) {
            elevations[resultIndex] = elevation;
          }
        }
      }),
    );
  }

  await Promise.all(batchTasks);

  return elevations;
}

export function clearElevationCacheForTests(): void {
  elevationCache.clear();
  activeElevationRequests = 0;
  elevationWaitQueue.length = 0;
}
