import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { LRUCache } from "lru-cache";
import type { GameArea, TentaclePoi } from "../../map/annotations";
import { gameAreaFingerprint } from "../core/gameAreaConvert";
import type { LatLngTuple } from "../kernel/types";
import { resolveClientMaskKernelMode } from "../kernel/resolveClientMaskKernelMode";
import {
  dispatchTentacleEliminationRegion,
  dispatchTentaclePoiAnswerEliminationRegion,
  type TentacleSite,
} from "../kernel/tentacleKernelRunner";
import {
  getCachedVoronoiCellsAsync,
  tentacleSitesFingerprint,
} from "../voronoi/voronoiCellCache";
import { persistSlimPolygonFeature } from "../progressive/persistSlim";

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

async function voronoiCellsForPois(
  pois: readonly TentaclePoi[],
): Promise<FeatureCollection> {
  const fingerprint = tentacleSitesFingerprint(pois);
  return getCachedVoronoiCellsAsync(
    fingerprint,
    pois.map((poi) => ({
      lng: poi.lng,
      lat: poi.lat,
      properties: { poiId: poi.id },
    })),
  );
}

export async function buildTentacleEliminationRegion(
  anchor: LatLngTuple,
  radiusMeters: number,
  pois: readonly TentaclePoi[],
  answeredPoiId: string,
  gameArea: GameArea,
): Promise<Feature<Polygon | MultiPolygon> | null> {
  const cells = await voronoiCellsForPois(pois);
  const mode = resolveClientMaskKernelMode();
  return dispatchTentacleEliminationRegion(
    {
      anchor,
      radiusMeters,
      sites: toTentacleSites(pois),
      answeredSiteId: answeredPoiId,
      gameArea,
      voronoiCells: cells,
    },
    mode,
  );
}

export async function buildTentaclePoiAnswerEliminationRegion(
  anchor: LatLngTuple,
  radiusMeters: number,
  pois: readonly TentaclePoi[],
  answeredPoiId: string,
  gameArea: GameArea,
): Promise<Feature<Polygon | MultiPolygon> | null> {
  if (!pois.some((poi) => poi.id === answeredPoiId)) {
    return null;
  }

  const cacheKey = `${tentacleSitesFingerprint(pois)}|${answeredPoiId}|${anchor[0].toFixed(6)}|${anchor[1].toFixed(6)}|${radiusMeters.toFixed(0)}|${gameAreaFingerprint(gameArea)}`;
  const cached = poiAnswerEliminationCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const cells = await voronoiCellsForPois(pois);
  const mode = resolveClientMaskKernelMode();
  const region = await dispatchTentaclePoiAnswerEliminationRegion(
    {
      anchor,
      radiusMeters,
      sites: toTentacleSites(pois),
      answeredSiteId: answeredPoiId,
      gameArea,
      voronoiCells: cells,
    },
    mode,
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
export async function tentacleEliminationJsonForAnswer(params: {
  anchor: LatLngTuple;
  radiusMeters: number;
  pois: readonly TentaclePoi[] | undefined;
  answeredPoiId: string | undefined;
  outOfReach: boolean;
  gameArea: GameArea;
}): Promise<string | undefined> {
  if (
    params.outOfReach ||
    !params.answeredPoiId ||
    !params.pois ||
    params.pois.length === 0
  ) {
    return undefined;
  }

  const region = await buildTentaclePoiAnswerEliminationRegion(
    params.anchor,
    params.radiusMeters,
    params.pois,
    params.answeredPoiId,
    params.gameArea,
  );
  if (!region) {
    return undefined;
  }

  const slimmed = persistSlimPolygonFeature(region);
  if (!slimmed.ok) {
    throw new Error(slimmed.message);
  }

  return JSON.stringify(slimmed.feature);
}

export type { TentacleSite };
