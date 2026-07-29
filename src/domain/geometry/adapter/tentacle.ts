import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { LRUCache } from "lru-cache";
import type { GameArea, TentaclePoi } from "../../map/annotations";
import { gameAreaFingerprint } from "../core/gameAreaConvert";
import type { LatLngTuple } from "../kernel/types";
import {
  buildTentacleEliminationRegion as kernelBuildTentacleEliminationRegion,
  buildTentaclePoiAnswerEliminationRegion as kernelBuildTentaclePoiAnswerEliminationRegion,
  type TentacleSite,
} from "../kernel/tentacleRegions";
import {
  getCachedVoronoiCells,
  tentacleSitesFingerprint,
} from "../voronoi/voronoiCellCache";

const POI_ANSWER_ELIMINATION_CACHE_MAX = 16;

const poiAnswerEliminationCache = new LRUCache<
  string,
  Feature<Polygon | MultiPolygon>
>({ max: POI_ANSWER_ELIMINATION_CACHE_MAX });

function toTentacleSites(pois: readonly TentaclePoi[]): TentacleSite[] {
  return pois.map((poi) => ({
    id: poi.id,
    lat: poi.lat,
    lng: poi.lng,
  }));
}

function voronoiCellsForPois(pois: readonly TentaclePoi[]): FeatureCollection {
  const fingerprint = tentacleSitesFingerprint(pois);
  return getCachedVoronoiCells(
    fingerprint,
    pois.map((poi) => ({
      lng: poi.lng,
      lat: poi.lat,
      properties: { poiId: poi.id },
    })),
  );
}

export function buildTentacleEliminationRegion(
  anchor: LatLngTuple,
  radiusMeters: number,
  pois: readonly TentaclePoi[],
  answeredPoiId: string,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  const cells = voronoiCellsForPois(pois);
  return kernelBuildTentacleEliminationRegion(
    anchor,
    radiusMeters,
    toTentacleSites(pois),
    answeredPoiId,
    gameArea,
    cells,
  );
}

export function buildTentaclePoiAnswerEliminationRegion(
  anchor: LatLngTuple,
  radiusMeters: number,
  pois: readonly TentaclePoi[],
  answeredPoiId: string,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  if (!pois.some((poi) => poi.id === answeredPoiId)) {
    return null;
  }

  const cacheKey = `${tentacleSitesFingerprint(pois)}|${answeredPoiId}|${anchor[0].toFixed(6)}|${anchor[1].toFixed(6)}|${radiusMeters.toFixed(0)}|${gameAreaFingerprint(gameArea)}`;
  const cached = poiAnswerEliminationCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const cells = voronoiCellsForPois(pois);
  const region = kernelBuildTentaclePoiAnswerEliminationRegion(
    anchor,
    radiusMeters,
    toTentacleSites(pois),
    answeredPoiId,
    gameArea,
    cells,
  );
  if (region) {
    poiAnswerEliminationCache.set(cacheKey, region);
  }
  return region;
}

export function clearTentacleEliminationCacheForTests(): void {
  poiAnswerEliminationCache.clear();
}

/** Serialized GeoJSON for metadata, or `undefined` when no shaded region applies. */
export function tentacleEliminationJsonForAnswer(params: {
  anchor: LatLngTuple;
  radiusMeters: number;
  pois: readonly TentaclePoi[] | undefined;
  answeredPoiId: string | undefined;
  outOfReach: boolean;
  gameArea: GameArea;
}): string | undefined {
  if (
    params.outOfReach ||
    !params.answeredPoiId ||
    !params.pois ||
    params.pois.length === 0
  ) {
    return undefined;
  }

  const region = buildTentaclePoiAnswerEliminationRegion(
    params.anchor,
    params.radiusMeters,
    params.pois,
    params.answeredPoiId,
    params.gameArea,
  );

  return region ? JSON.stringify(region) : undefined;
}

export type { TentacleSite };
