import type { Feature, MultiPolygon, Polygon } from "geojson";
import turfCircle from "@turf/circle";
import { featureCollection, point as turfPoint } from "@turf/helpers";
import difference from "@turf/difference";
import intersect from "@turf/intersect";
import simplify from "@turf/simplify";
import type { GameArea, TentaclePoi } from "../map/annotations";
import { voronoiCellSiteId } from "./voronoiCellSiteId";
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

const SIMPLIFY_TOLERANCE = 0.000012;
const DISK_STEPS = 64;

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
): Feature<Polygon | MultiPolygon>[] {
  const fingerprint = tentacleSitesFingerprint(pois);
  const cells = getCachedVoronoiCells(
    fingerprint,
    pois.map((poi) => ({
      lng: poi.lng,
      lat: poi.lat,
      properties: { poiId: poi.id },
    })),
  );

  return cells.features.filter(
    (feature) =>
      feature.geometry.type === "Polygon" ||
      feature.geometry.type === "MultiPolygon",
  ) as Feature<Polygon | MultiPolygon>[];
}

function buildEliminationViaDiskDifference(
  anchor: LatLngTuple,
  radiusMeters: number,
  cells: readonly Feature<Polygon | MultiPolygon>[],
  answeredPoiId: string,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  const answeredCell = cells.find(
    (feature) => voronoiCellSiteId(feature, ["poiId"]) === answeredPoiId,
  );

  if (!answeredCell) {
    return null;
  }

  const disk = buildSearchDisk(anchor, radiusMeters);

  let answeredInDisk: Feature<Polygon | MultiPolygon> | null = null;
  try {
    const clipped = intersect(
      featureCollection([answeredCell, disk as Feature<Polygon>]),
    );
    if (
      clipped &&
      (clipped.geometry.type === "Polygon" ||
        clipped.geometry.type === "MultiPolygon")
    ) {
      answeredInDisk = clipped as Feature<Polygon | MultiPolygon>;
    }
  } catch {
    return null;
  }

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
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  const wrongCells = cells.filter((feature) => {
    const siteId = voronoiCellSiteId(feature, ["poiId"]);
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

  const cells = voronoiCellsForPois(pois);
  const hasResolvableSiteIds = cells.some(
    (cell) => voronoiCellSiteId(cell, ["poiId"]) != null,
  );

  return (
    (hasResolvableSiteIds
      ? buildEliminationViaWrongCellUnion(
          anchor,
          radiusMeters,
          cells,
          answeredPoiId,
          gameArea,
        )
      : null) ??
    buildEliminationViaDiskDifference(
      anchor,
      radiusMeters,
      cells,
      answeredPoiId,
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
  return safeDifference(gameAreaToPolygon(gameArea), disk);
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
