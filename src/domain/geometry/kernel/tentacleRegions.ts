import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import turfCircle from "@turf/circle";
import { featureCollection, point as turfPoint } from "@turf/helpers";
import difference from "@turf/difference";
import intersect from "@turf/intersect";
import simplify from "@turf/simplify";
import { safeDifference } from "../core/geodesicPrimitives";
import { clipMaskToGameArea } from "./clipMask";
import { gameAreaGeometryToFeature } from "./featureConvert";
import {
  resolveVoronoiCellSiteId,
  type VoronoiSiteRef,
} from "./voronoiCellSiteId";
import { unionPolygonFeatures } from "./unionPolygonFeatures";
import type { GameAreaGeometry, LatLngTuple, PolygonFeature } from "./types";

const SIMPLIFY_TOLERANCE = 0.000012;
const DISK_STEPS = 64;
/** Fallback hole when a Voronoi cell polygon is missing (~25 m). */
const POI_CELL_FALLBACK_RADIUS_KM = 0.025;

export type TentacleSite = VoronoiSiteRef;

function cellSiteId(
  cell: Feature,
  sites: readonly TentacleSite[],
): string | undefined {
  return resolveVoronoiCellSiteId(cell, sites, ["poiId"]);
}

function everySiteHasResolvableCell(
  cells: readonly Feature[],
  sites: readonly TentacleSite[],
): boolean {
  const resolved = new Set<string>();
  for (const cell of cells) {
    const siteId = cellSiteId(cell, sites);
    if (siteId) {
      resolved.add(siteId);
    }
  }
  return sites.every((site) => resolved.has(site.id));
}

function clipToGameArea(
  feature: Feature<Polygon | MultiPolygon>,
  gameArea: GameAreaGeometry,
): Feature<Polygon | MultiPolygon> | null {
  return clipMaskToGameArea(feature as PolygonFeature, gameArea);
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

function polygonCellsFromCollection(
  cells: FeatureCollection,
): Feature<Polygon | MultiPolygon>[] {
  return cells.features.filter(
    (feature) =>
      feature.geometry.type === "Polygon" ||
      feature.geometry.type === "MultiPolygon",
  ) as Feature<Polygon | MultiPolygon>[];
}

function answeredCellInDisk(
  cells: readonly Feature<Polygon | MultiPolygon>[],
  answeredSiteId: string,
  sites: readonly TentacleSite[],
  disk: Feature<Polygon>,
): Feature<Polygon | MultiPolygon> | null {
  const answeredCell = cells.find(
    (feature) => cellSiteId(feature, sites) === answeredSiteId,
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

  const answeredSite = sites.find((site) => site.id === answeredSiteId);
  if (!answeredSite) {
    return null;
  }

  const siteHole = turfCircle(
    turfPoint([answeredSite.lng, answeredSite.lat]),
    POI_CELL_FALLBACK_RADIUS_KM,
    { steps: 24, units: "kilometers" },
  ) as Feature<Polygon>;

  try {
    const clipped = intersect(
      featureCollection([siteHole, disk as Feature<Polygon>]),
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
  answeredSiteId: string,
  sites: readonly TentacleSite[],
  gameArea: GameAreaGeometry,
): Feature<Polygon | MultiPolygon> | null {
  const disk = buildSearchDisk(anchor, radiusMeters);
  const answeredInDisk = answeredCellInDisk(
    cells,
    answeredSiteId,
    sites,
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
  answeredSiteId: string,
  sites: readonly TentacleSite[],
  gameArea: GameAreaGeometry,
): Feature<Polygon | MultiPolygon> | null {
  const wrongCells = cells.filter((feature) => {
    const siteId = cellSiteId(feature, sites);
    return siteId != null && siteId !== answeredSiteId;
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
 * Within the seeker's radius, shade everywhere except the answered site's
 * nearest-neighbor cell (spatial Voronoi), clipped to the search disk.
 */
export function buildTentacleEliminationRegion(
  anchor: LatLngTuple,
  radiusMeters: number,
  sites: readonly TentacleSite[],
  answeredSiteId: string,
  gameArea: GameAreaGeometry,
  voronoiCells: FeatureCollection,
): Feature<Polygon | MultiPolygon> | null {
  if (sites.length < 2) {
    return null;
  }

  const answered = sites.some((site) => site.id === answeredSiteId);
  if (!answered) {
    return null;
  }

  const polygonCells = polygonCellsFromCollection(voronoiCells);
  const allCellsResolvable = everySiteHasResolvableCell(
    voronoiCells.features,
    sites,
  );
  const useWrongCellUnion = sites.length === 2 && allCellsResolvable;

  const wrongUnion = useWrongCellUnion
    ? buildEliminationViaWrongCellUnion(
        anchor,
        radiusMeters,
        polygonCells,
        answeredSiteId,
        sites,
        gameArea,
      )
    : null;

  return (
    wrongUnion ??
    buildEliminationViaDiskDifference(
      anchor,
      radiusMeters,
      polygonCells,
      answeredSiteId,
      sites,
      gameArea,
    )
  );
}

function buildTentacleExteriorElimination(
  anchor: LatLngTuple,
  radiusMeters: number,
  gameArea: GameAreaGeometry,
): Feature<Polygon | MultiPolygon> | null {
  const disk = buildSearchDisk(anchor, radiusMeters);
  const gameFeature = gameAreaGeometryToFeature(gameArea);
  const exterior = safeDifference(gameFeature, disk);
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
  sites: readonly TentacleSite[],
  answeredSiteId: string,
  gameArea: GameAreaGeometry,
  voronoiCells: FeatureCollection,
): Feature<Polygon | MultiPolygon> | null {
  if (!sites.some((site) => site.id === answeredSiteId)) {
    return null;
  }

  const exterior = buildTentacleExteriorElimination(
    anchor,
    radiusMeters,
    gameArea,
  );

  if (sites.length < 2) {
    return exterior;
  }

  const inner = buildTentacleEliminationRegion(
    anchor,
    radiusMeters,
    sites,
    answeredSiteId,
    gameArea,
    voronoiCells,
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
