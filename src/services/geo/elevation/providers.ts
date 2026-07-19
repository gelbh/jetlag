import type { LatLngTuple } from "../../../domain/geometry/geometry";
import {
  ELEVATION_MIN_429_BACKOFF_MS,
  OPEN_METEO_ELEVATION_ENDPOINT,
  USGS_EPQS_ENDPOINT,
  USGS_MIN_REQUEST_GAP_MS,
  type ElevationFetchProfile,
  type OpenMeteoElevationResponse,
  type UsgsEpqsResponse,
} from "./constants";
import {
  elevationCacheKey,
  markElevationRequestCompleted,
  maxRetriesForProfile,
  record429Response,
  recordSuccessfulElevationResponse,
  retryDelayMs,
  sleep,
  waitForElevationBatchGap,
  writeCachedElevation,
} from "./rateLimit";

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

export async function fetchElevationBatchAndWrite(
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
      void writeCachedElevation(key, elevation);
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
