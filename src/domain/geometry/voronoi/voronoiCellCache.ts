import { LRUCache } from "lru-cache";
import type { FeatureCollection } from "geojson";
import { resolveClientMaskKernelMode } from "../kernel/resolveClientMaskKernelMode";
import type { MaskKernelMode } from "../kernel/maskKernelMode";
import { runSpatialVoronoi } from "../kernel/voronoiKernelRunner";

const VORONOI_CACHE_MAX = 8;

const voronoiCellCache = new LRUCache<string, FeatureCollection>({
  max: VORONOI_CACHE_MAX,
});

const voronoiInFlight = new Map<string, Promise<FeatureCollection>>();

export function matchingSitesFingerprint(
  features: Array<{ id: string; point: readonly [number, number] }>,
): string {
  return features
    .map(
      (feature) =>
        `${feature.id}:${feature.point[0].toFixed(6)}:${feature.point[1].toFixed(6)}`,
    )
    .sort()
    .join("|");
}

export function tentacleSitesFingerprint(
  pois: ReadonlyArray<{ id: string; lat: number; lng: number }>,
): string {
  return pois
    .map((poi) => `${poi.id}:${poi.lat.toFixed(6)}:${poi.lng.toFixed(6)}`)
    .sort()
    .join("|");
}

function cacheKey(fingerprint: string, mode: MaskKernelMode): string {
  return `${fingerprint}|${mode}`;
}

export async function getCachedVoronoiCellsAsync(
  fingerprint: string,
  sites: Array<{
    lng: number;
    lat: number;
    properties: Record<string, unknown>;
  }>,
): Promise<FeatureCollection> {
  const mode = resolveClientMaskKernelMode();
  const key = cacheKey(fingerprint, mode);
  const cached = voronoiCellCache.get(key);
  if (cached) {
    return cached;
  }

  const existing = voronoiInFlight.get(key);
  if (existing) {
    return existing;
  }

  const pending = runSpatialVoronoi(sites, mode)
    .then((cells) => {
      voronoiCellCache.set(key, cells);
      return cells;
    })
    .finally(() => {
      voronoiInFlight.delete(key);
    });

  voronoiInFlight.set(key, pending);
  return pending;
}

export function clearVoronoiCellCacheForTests(): void {
  voronoiCellCache.clear();
  voronoiInFlight.clear();
}
