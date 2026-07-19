import type { LatLngTuple } from "../../../domain/geometry/geometry";
import { ELEVATION_BATCH_SIZE, type FetchElevationsOptions } from "./constants";
import { fetchElevationBatchAndWrite } from "./providers";
import {
  elevationCacheKey,
  hydrateElevationCacheFromIdb,
  isElevationCircuitOpen,
  readCachedElevation,
  runLimitedElevationRequest,
} from "./rateLimit";

export type {
  ElevationFetchProfile,
  FetchElevationsOptions,
} from "./constants";
export {
  clearElevationCacheForTests,
  hydrateElevationCacheFromIdb,
  isElevationCircuitOpen,
  openElevationCircuitForTests,
  requestGapMsForBatchSize,
} from "./rateLimit";
export { isUsElevationPoint } from "./providers";

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

    const pending = pendingByKey.get(key);
    if (pending) {
      pending.indices.push(index);
      continue;
    }

    pendingByKey.set(key, { point, indices: [index] });
  }

  if (pendingByKey.size > 0) {
    await hydrateElevationCacheFromIdb([...pendingByKey.keys()]);
    for (const [key, pending] of pendingByKey) {
      const cached = readCachedElevation(key);
      if (cached === undefined) {
        continue;
      }
      for (const index of pending.indices) {
        elevations[index] = cached;
      }
      pendingByKey.delete(key);
    }
  }

  if (pendingByKey.size === 0) {
    return elevations;
  }

  if (isElevationCircuitOpen()) {
    for (const pending of pendingByKey.values()) {
      for (const index of pending.indices) {
        elevations[index] = Number.NaN;
      }
    }
    return elevations;
  }

  const pendingPoints = [...pendingByKey.values()];

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
