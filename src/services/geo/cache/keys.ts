import type { GameArea } from "@/domain/map/annotations";
import type { RegionPackId } from "@/domain/regions/regionPack";

function stableGameAreaKey(gameArea: GameArea): string {
  return JSON.stringify(gameArea.coordinates);
}

export function geographicCacheKey(gameArea: GameArea, scope: string): string {
  return `${scope}:${stableGameAreaKey(gameArea)}`;
}

export function elevationPointCacheKey(lat: number, lng: number): string {
  return `elevation:${lat.toFixed(5)},${lng.toFixed(5)}`;
}

/** Single blob holding per-stage duration history for progress estimates. */
export const PROGRESS_HISTORY_CACHE_KEY = "progress-history";

export function isStableCacheKey(key: string): boolean {
  return (
    key.startsWith("admin:") ||
    key.startsWith("landmass:") ||
    key.startsWith("coastline:") ||
    key.startsWith("sea_level:sampling:") ||
    key === PROGRESS_HISTORY_CACHE_KEY
  );
}

export function coastlineSegmentsCacheKey(gameArea: GameArea): string {
  return geographicCacheKey(gameArea, "coastline:segments");
}

export function linearSegmentsCacheKey(gameArea: GameArea, kind: string): string {
  return geographicCacheKey(gameArea, `linear:${kind}`);
}

export function seaLevelSamplingCacheKey(gameArea: GameArea): string {
  return geographicCacheKey(gameArea, "sea_level:sampling");
}

export function adminDivisionCacheKey(gameArea: GameArea, adminLevel: number): string {
  return geographicCacheKey(gameArea, `admin:v2:${adminLevel}`);
}

export function landmassCacheKey(gameArea: GameArea, regionPackId?: RegionPackId): string {
  const packSuffix = regionPackId ? `:${regionPackId}` : "";
  return geographicCacheKey(gameArea, `landmass:v3${packSuffix}`);
}

export function measuringPlacesCacheKey(gameArea: GameArea, category: string): string {
  return geographicCacheKey(gameArea, `measuring:v3:${category}`);
}

export function tentaclePoisCacheKey(
  center: [number, number],
  radiusMeters: number,
  categoryId: string,
): string {
  return `tentacle:v2:${categoryId}:${center[0]},${center[1]}:${radiusMeters}`;
}

export function staticTransitCacheKey(gameArea: GameArea): string {
  return geographicCacheKey(gameArea, "transit:static");
}
