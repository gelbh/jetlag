import type { Position } from "geojson";
import type { GameAreaGeometry } from "../kernel/types";
import {
  MIN_GAME_AREA_LAT_SPAN,
  MIN_GAME_AREA_LNG_SPAN,
} from "./gameAreaConstants";

export interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

/** Meters per degree of latitude (equirectangular; same family as expand). */
export const METERS_PER_DEGREE_LAT = 111_320;

export function normalizeBoundingBox(box: BoundingBox): BoundingBox {
  let { south, west, north, east } = box;
  const latSpan = north - south;
  const lngSpan = east - west;

  if (latSpan < MIN_GAME_AREA_LAT_SPAN) {
    const centerLat = (north + south) / 2;
    south = centerLat - MIN_GAME_AREA_LAT_SPAN / 2;
    north = centerLat + MIN_GAME_AREA_LAT_SPAN / 2;
  }

  if (lngSpan < MIN_GAME_AREA_LNG_SPAN) {
    const centerLng = (east + west) / 2;
    west = centerLng - MIN_GAME_AREA_LNG_SPAN / 2;
    east = centerLng + MIN_GAME_AREA_LNG_SPAN / 2;
  }

  return { south, west, north, east };
}

/**
 * Raw axis-aligned bbox intersection without {@link normalizeBoundingBox}.
 * Tiny intersections stay tiny (attach scoring, threshold tests).
 */
export function intersectBoundingBoxesRaw(
  a: BoundingBox,
  b: BoundingBox,
): BoundingBox | null {
  const south = Math.max(a.south, b.south);
  const west = Math.max(a.west, b.west);
  const north = Math.min(a.north, b.north);
  const east = Math.min(a.east, b.east);

  if (south >= north || west >= east) {
    return null;
  }

  return { south, west, north, east };
}

export function intersectBoundingBoxes(
  a: BoundingBox,
  b: BoundingBox,
): BoundingBox | null {
  const intersection = intersectBoundingBoxesRaw(a, b);
  return intersection ? normalizeBoundingBox(intersection) : null;
}

/**
 * Approximate bbox area in km² via mid-latitude equirectangular projection
 * using {@link METERS_PER_DEGREE_LAT}.
 */
export function boundingBoxAreaKm2(box: BoundingBox): number {
  const midLat = (box.north + box.south) / 2;
  const latMeters = (box.north - box.south) * METERS_PER_DEGREE_LAT;
  const lngMeters =
    (box.east - box.west) *
    METERS_PER_DEGREE_LAT *
    Math.cos((midLat * Math.PI) / 180);
  return Math.max((latMeters * lngMeters) / 1_000_000, 0);
}

function collectPositions(gameArea: GameAreaGeometry): Position[] {
  if (gameArea.type === "MultiPolygon") {
    return gameArea.coordinates.flatMap((polygon) =>
      polygon.flatMap((ring) => ring),
    );
  }

  return gameArea.coordinates.flatMap((ring) => ring);
}

export function boundingBoxToGameArea(box: BoundingBox): GameAreaGeometry {
  const normalized = normalizeBoundingBox(box);

  return {
    type: "Polygon",
    coordinates: [
      [
        [normalized.west, normalized.south],
        [normalized.east, normalized.south],
        [normalized.east, normalized.north],
        [normalized.west, normalized.north],
        [normalized.west, normalized.south],
      ],
    ],
  };
}

/** Unexpanded AABB from game-area coordinates (no min-span inflate). */
export function gameAreaToBoundingBoxRaw(
  gameArea: GameAreaGeometry,
): BoundingBox {
  const positions = collectPositions(gameArea);
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;

  for (const [lng, lat] of positions) {
    if (lat < south) south = lat;
    if (lat > north) north = lat;
    if (lng < west) west = lng;
    if (lng > east) east = lng;
  }

  return { south, west, north, east };
}

export function gameAreaToBoundingBox(gameArea: GameAreaGeometry): BoundingBox {
  return normalizeBoundingBox(gameAreaToBoundingBoxRaw(gameArea));
}

export function expandBoundingBox(
  box: BoundingBox,
  bufferMeters: number,
): BoundingBox {
  if (bufferMeters <= 0) {
    return normalizeBoundingBox(box);
  }

  const centerLat = (box.north + box.south) / 2;
  const latDelta = bufferMeters / METERS_PER_DEGREE_LAT;
  const lngDelta =
    bufferMeters /
    (METERS_PER_DEGREE_LAT * Math.cos((centerLat * Math.PI) / 180));

  return normalizeBoundingBox({
    south: box.south - latDelta,
    west: box.west - lngDelta,
    north: box.north + latDelta,
    east: box.east + lngDelta,
  });
}
