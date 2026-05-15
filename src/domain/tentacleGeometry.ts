import type { Feature, MultiPolygon, Polygon } from "geojson";
import turfCircle from "@turf/circle";
import { featureCollection, point as turfPoint } from "@turf/helpers";
import intersect from "@turf/intersect";
import simplify from "@turf/simplify";
import union from "@turf/union";
import voronoi from "@turf/voronoi";
import type { GameArea, TentaclePoi } from "./annotations";
import {
  gameAreaToBoundingBox,
  gameAreaToPolygon,
  type LatLngTuple,
} from "./geometry";

const VORONOI_BBOX_MARGIN_DEG = 0.0004;
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

function tentacleVoronoiBbox(
  anchor: LatLngTuple,
  radiusMeters: number,
  pois: readonly TentaclePoi[],
  gameArea: GameArea,
): [number, number, number, number] {
  const gameBb = gameAreaToBoundingBox(gameArea);
  const [latA, lngA] = anchor;
  const padLat = radiusMeters / 111_320;
  const cosLat = Math.cos((latA * Math.PI) / 180);
  const padLng = radiusMeters / (111_320 * Math.max(cosLat, 0.2));

  let south = latA - padLat * 1.08;
  let north = latA + padLat * 1.08;
  let west = lngA - padLng * 1.08;
  let east = lngA + padLng * 1.08;

  for (const p of pois) {
    south = Math.min(south, p.lat);
    north = Math.max(north, p.lat);
    west = Math.min(west, p.lng);
    east = Math.max(east, p.lng);
  }

  south = Math.max(gameBb.south, south - VORONOI_BBOX_MARGIN_DEG);
  north = Math.min(gameBb.north, north + VORONOI_BBOX_MARGIN_DEG);
  west = Math.max(gameBb.west, west - VORONOI_BBOX_MARGIN_DEG);
  east = Math.min(gameBb.east, east + VORONOI_BBOX_MARGIN_DEG);

  if (south >= north || west >= east) {
    return [gameBb.west, gameBb.south, gameBb.east, gameBb.north];
  }

  return [west, south, east, north];
}

/**
 * Within the seeker's radius, where another loaded POI is the planar nearest
 * site (Voronoi cell), clipped to the disk — smooth polygons like measuring
 * coastline buffers, not a coarse grid.
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

  const bbox = tentacleVoronoiBbox(anchor, radiusMeters, pois, gameArea);
  const sites = featureCollection(
    pois.map((poi) => turfPoint([poi.lng, poi.lat], { poiId: poi.id })),
  );

  const cells = voronoi(sites, { bbox });
  const wrongCells = cells.features.filter(
    (f) => (f.properties as { poiId?: string } | null)?.poiId !== answeredPoiId,
  );

  if (wrongCells.length === 0) {
    return null;
  }

  const merged =
    wrongCells.length === 1
      ? wrongCells[0]
      : union(featureCollection(wrongCells));

  if (
    !merged ||
    (merged.geometry.type !== "Polygon" &&
      merged.geometry.type !== "MultiPolygon")
  ) {
    return null;
  }

  const disk = turfCircle(
    turfPoint([anchor[1], anchor[0]]),
    radiusMeters / 1000,
    { steps: DISK_STEPS, units: "kilometers" },
  );

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
    params.pois.length < 2
  ) {
    return undefined;
  }

  const region = buildTentacleEliminationRegion(
    params.anchor,
    params.radiusMeters,
    params.pois,
    params.answeredPoiId,
    params.gameArea,
  );

  return region ? JSON.stringify(region) : undefined;
}
