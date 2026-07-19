import type { GameArea } from "../../../domain/map/annotations";

function stableGameAreaKey(gameArea: GameArea): string {
  return JSON.stringify(gameArea.coordinates);
}

export function geographicCacheKey(gameArea: GameArea, scope: string): string {
  return `${scope}:${stableGameAreaKey(gameArea)}`;
}

export function elevationPointCacheKey(lat: number, lng: number): string {
  return `elevation:${lat.toFixed(5)},${lng.toFixed(5)}`;
}

export function isStableCacheKey(key: string): boolean {
  return (
    key.startsWith("admin:") ||
    key.startsWith("landmass:") ||
    key.startsWith("coastline:") ||
    key.startsWith("sea_level:sampling:") ||
    key.startsWith("elevation:")
  );
}

export function coastlineSegmentsCacheKey(gameArea: GameArea): string {
  return geographicCacheKey(gameArea, "coastline:segments");
}

export function linearSegmentsCacheKey(
  gameArea: GameArea,
  kind: string,
): string {
  return geographicCacheKey(gameArea, `linear:${kind}`);
}

export function seaLevelSamplingCacheKey(gameArea: GameArea): string {
  return geographicCacheKey(gameArea, "sea_level:sampling");
}

export function adminDivisionCacheKey(
  gameArea: GameArea,
  adminLevel: number,
): string {
  return geographicCacheKey(gameArea, `admin:${adminLevel}`);
}

export function landmassCacheKey(gameArea: GameArea): string {
  return geographicCacheKey(gameArea, "landmass");
}

export function measuringPlacesCacheKey(
  gameArea: GameArea,
  category: string,
): string {
  return geographicCacheKey(gameArea, `measuring:${category}`);
}

export function tentaclePoisCacheKey(
  center: [number, number],
  radiusMeters: number,
  categoryId: string,
): string {
  return `tentacle:${categoryId}:${center[0]},${center[1]}:${radiusMeters}`;
}

export function staticTransitCacheKey(gameArea: GameArea): string {
  return geographicCacheKey(gameArea, "transit:static");
}
