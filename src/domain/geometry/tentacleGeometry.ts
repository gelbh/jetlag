import type { Feature, MultiPolygon, Polygon } from "geojson";
import turfCircle from "@turf/circle";
import { featureCollection, point as turfPoint } from "@turf/helpers";
import difference from "@turf/difference";
import intersect from "@turf/intersect";
import simplify from "@turf/simplify";
import { LRUCache } from "lru-cache";
import type { GameArea, TentaclePoi } from "../map/annotations";
import { resolveVoronoiCellPoiId } from "./voronoiCellSiteId";
import {
  getCachedVoronoiCells,
  tentacleSitesFingerprint,
} from "./voronoiCellCache";
import { unionPolygonFeatures } from "./unionPolygonFeatures";
import {
  gameAreaToPolygon,
  safeDifference,
  type LatLngTuple,
} from "./geometry";
import { gameAreaFingerprint } from "./core/gameAreaConvert";

const SIMPLIFY_TOLERANCE = 0.000012;
const DISK_STEPS = 64;
/** Fallback hole when a Voronoi cell polygon is missing (~25 m). */
const POI_CELL_FALLBACK_RADIUS_KM = 0.025;
const POI_ANSWER_ELIMINATION_CACHE_MAX = 16;

const poiAnswerEliminationCache = new LRUCache<
  string,
  Feature<Polygon | MultiPolygon>
>({ max: POI_ANSWER_ELIMINATION_CACHE_MAX });

function cellPoiId(
  cell: Feature,
  pois: readonly TentaclePoi[],
): string | undefined {
  return resolveVoronoiCellPoiId(cell, pois, ["poiId"]);
}

function everyPoiHasResolvableCell(
  cells: readonly Feature[],
  pois: readonly TentaclePoi[],
): boolean {
  const resolved = new Set<string>();
  for (const cell of cells) {
    const poiId = cellPoiId(cell, pois);
    if (poiId) {
      resolved.add(poiId);
    }
  }
  return pois.every((poi) => resolved.has(poi.id));
}

function clipToGameArea(
  feature: Feature<Polygon | MultiPolygon>,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  const gameFeature = gameAreaToPolygon(gameArea);
  try {
    const clipped = intersect({
      type: "FeatureCollection",
      features: [gameFeature, feature],
    });

    if (
      clipped &&
      (clipped.geometry.type === "Polygon" ||
        clipped.geometry.type === "MultiPolygon")
    ) {
      return clipped as Feature<Polygon | MultiPolygon>;
    }
  } catch {
    /* polyclip / intersect can throw on complex polygons */
  }

  return feature;
}

function buildSearchDisk(
  anchor: LatLngTuple,
  radiusMeters: number,
): Feature<Polygon> {
  return turfCircle(
    turfPoint([anchor[1], anchor[0]]),
    radiusMeters / 1000,
    { steps: DISK_STEPS, units: "kilometers" },
  ) as Feature<Polygon>;
}

function voronoiCellsForPois(
  pois: readonly TentaclePoi[],
): {
  polygonCells: Feature<Polygon | MultiPolygon>[];
  allFeatures: Feature[];
} {
  const fingerprint = tentacleSitesFingerprint(pois);
  const cells = getCachedVoronoiCells(
    fingerprint,
    pois.map((poi) => ({
      lng: poi.lng,
      lat: poi.lat,
      properties: { poiId: poi.id },
    })),
  );

  const polygonCells = cells.features.filter(
    (feature) =>
      feature.geometry.type === "Polygon" ||
      feature.geometry.type === "MultiPolygon",
  ) as Feature<Polygon | MultiPolygon>[];

  return { polygonCells, allFeatures: cells.features };
}

function answeredCellInDisk(
  cells: readonly Feature<Polygon | MultiPolygon>[],
  answeredPoiId: string,
  pois: readonly TentaclePoi[],
  disk: Feature<Polygon>,
): Feature<Polygon | MultiPolygon> | null {
  const answeredCell = cells.find(
    (feature) => cellPoiId(feature, pois) === answeredPoiId,
  );

  if (answeredCell) {
    try {
      const clipped = intersect(
        featureCollection([answeredCell, disk as Feature<Polygon>]),
      );
      if (
        clipped &&
        (clipped.geometry.type === "Polygon" ||
          clipped.geometry.type === "MultiPolygon")
      ) {
        return clipped as Feature<Polygon | MultiPolygon>;
      }
    } catch {
      /* intersect can throw on complex polygons */
    }
  }

  const answeredPoi = pois.find((poi) => poi.id === answeredPoiId);
  if (!answeredPoi) {
    return null;
  }

  const poiHole = turfCircle(
    turfPoint([answeredPoi.lng, answeredPoi.lat]),
    POI_CELL_FALLBACK_RADIUS_KM,
    { steps: 24, units: "kilometers" },
  ) as Feature<Polygon>;

  try {
    const clipped = intersect(
      featureCollection([poiHole, disk as Feature<Polygon>]),
    );
    if (
      clipped &&
      (clipped.geometry.type === "Polygon" ||
        clipped.geometry.type === "MultiPolygon")
    ) {
      return clipped as Feature<Polygon | MultiPolygon>;
    }
  } catch {
    return null;
  }

  return null;
}

function buildEliminationViaDiskDifference(
  anchor: LatLngTuple,
  radiusMeters: number,
  cells: readonly Feature<Polygon | MultiPolygon>[],
  answeredPoiId: string,
  pois: readonly TentaclePoi[],
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  const disk = buildSearchDisk(anchor, radiusMeters);
  const answeredInDisk = answeredCellInDisk(
    cells,
    answeredPoiId,
    pois,
    disk,
  );

  if (!answeredInDisk) {
    return null;
  }

  try {
    const eliminated = difference(
      featureCollection([disk, answeredInDisk as Feature<Polygon>]),
    );

    if (
      !eliminated ||
      (eliminated.geometry.type !== "Polygon" &&
        eliminated.geometry.type !== "MultiPolygon")
    ) {
      return null;
    }

    const smoothed = simplify(eliminated as Feature<Polygon | MultiPolygon>, {
      tolerance: SIMPLIFY_TOLERANCE,
      highQuality: true,
    }) as Feature<Polygon | MultiPolygon>;

    return clipToGameArea(smoothed, gameArea);
  } catch {
    return null;
  }
}

function buildEliminationViaWrongCellUnion(
  anchor: LatLngTuple,
  radiusMeters: number,
  cells: readonly Feature<Polygon | MultiPolygon>[],
  answeredPoiId: string,
  pois: readonly TentaclePoi[],
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  const wrongCells = cells.filter((feature) => {
    const siteId = cellPoiId(feature, pois);
    return siteId != null && siteId !== answeredPoiId;
  });

  if (wrongCells.length === 0) {
    return null;
  }

  const merged =
    wrongCells.length === 1
      ? wrongCells[0]
      : unionPolygonFeatures(wrongCells);

  if (
    !merged ||
    (merged.geometry.type !== "Polygon" &&
      merged.geometry.type !== "MultiPolygon")
  ) {
    return null;
  }

  const disk = buildSearchDisk(anchor, radiusMeters);

  let inDisk: Feature<Polygon | MultiPolygon> | null = null;
  try {
    const clipped = intersect(
      featureCollection([merged, disk as Feature<Polygon>]),
    );
    if (
      clipped &&
      (clipped.geometry.type === "Polygon" ||
        clipped.geometry.type === "MultiPolygon")
    ) {
      inDisk = clipped as Feature<Polygon | MultiPolygon>;
    }
  } catch {
    return null;
  }

  if (!inDisk) {
    return null;
  }

  const smoothed = simplify(inDisk, {
    tolerance: SIMPLIFY_TOLERANCE,
    highQuality: true,
  }) as Feature<Polygon | MultiPolygon>;

  return clipToGameArea(smoothed, gameArea);
}

/**
 * Within the seeker's radius, shade everywhere except the answered POI's
 * nearest-neighbor cell (spatial Voronoi), clipped to the search disk.
 */
export function buildTentacleEliminationRegion(
  anchor: LatLngTuple,
  radiusMeters: number,
  pois: readonly TentaclePoi[],
  answeredPoiId: string,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  if (pois.length < 2) {
    return null;
  }

  const answered = pois.some((poi) => poi.id === answeredPoiId);
  if (!answered) {
    return null;
  }

  const { polygonCells, allFeatures } = voronoiCellsForPois(pois);
  const allCellsResolvable = everyPoiHasResolvableCell(allFeatures, pois);
  const useWrongCellUnion = pois.length === 2 && allCellsResolvable;

  const wrongUnion = useWrongCellUnion
    ? buildEliminationViaWrongCellUnion(
        anchor,
        radiusMeters,
        polygonCells,
        answeredPoiId,
        pois,
        gameArea,
      )
    : null;

  return (
    wrongUnion ??
    buildEliminationViaDiskDifference(
      anchor,
      radiusMeters,
      polygonCells,
      answeredPoiId,
      pois,
      gameArea,
    )
  );
}

function buildTentacleExteriorElimination(
  anchor: LatLngTuple,
  radiusMeters: number,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  const disk = buildSearchDisk(anchor, radiusMeters);
  const exterior = safeDifference(gameAreaToPolygon(gameArea), disk);
  if (
    !exterior ||
    (exterior.geometry.type !== "Polygon" &&
      exterior.geometry.type !== "MultiPolygon")
  ) {
    return null;
  }

  const smoothed = simplify(exterior, {
    tolerance: SIMPLIFY_TOLERANCE,
    highQuality: true,
  }) as Feature<Polygon | MultiPolygon>;

  return clipToGameArea(smoothed, gameArea);
}

/**
 * POI-answer elimination: play area outside the search disk plus inner Voronoi
 * shading within the disk (radar-yes exterior + tentacle bisector interior).
 */
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

  const region = buildTentaclePoiAnswerEliminationRegionUncached(
    anchor,
    radiusMeters,
    pois,
    answeredPoiId,
    gameArea,
  );
  if (region) {
    poiAnswerEliminationCache.set(cacheKey, region);
  }
  return region;
}

function buildTentaclePoiAnswerEliminationRegionUncached(
  anchor: LatLngTuple,
  radiusMeters: number,
  pois: readonly TentaclePoi[],
  answeredPoiId: string,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  const exterior = buildTentacleExteriorElimination(
    anchor,
    radiusMeters,
    gameArea,
  );

  if (pois.length < 2) {
    return exterior;
  }

  const inner = buildTentacleEliminationRegion(
    anchor,
    radiusMeters,
    pois,
    answeredPoiId,
    gameArea,
  );

  if (!exterior && !inner) {
    return null;
  }

  if (!inner) {
    return exterior;
  }

  if (!exterior) {
    return inner;
  }

  const merged = unionPolygonFeatures([exterior, inner]);
  if (
    !merged ||
    (merged.geometry.type !== "Polygon" &&
      merged.geometry.type !== "MultiPolygon")
  ) {
    return exterior;
  }

  return clipToGameArea(merged, gameArea);
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
