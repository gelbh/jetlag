import { LRUCache } from "lru-cache";
import type { FeatureCollection } from "geojson";
import { geoSpatialVoronoiFromSites } from "./geoSpatialVoronoi";

const VORONOI_CACHE_MAX = 8;

const voronoiCellCache = new LRUCache<string, FeatureCollection>({
  max: VORONOI_CACHE_MAX,
});

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

export function getCachedVoronoiCells(
  fingerprint: string,
  sites: Array<{
    lng: number;
    lat: number;
    properties: Record<string, unknown>;
  }>,
): FeatureCollection {
  const cached = voronoiCellCache.get(fingerprint);
  if (cached) {
    return cached;
  }

  const cells = geoSpatialVoronoiFromSites(sites);
  voronoiCellCache.set(fingerprint, cells);
  return cells;
}

export function clearVoronoiCellCacheForTests(): void {
  voronoiCellCache.clear();
}
