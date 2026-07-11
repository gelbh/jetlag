import type { LatLngBounds, LatLngBoundsExpression } from "leaflet";
import { latLng, latLngBounds } from "leaflet";
import type { Feature, MultiPolygon, Polygon, Position } from "geojson";
import bboxPolygon from "@turf/bbox-polygon";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import turfCircle from "@turf/circle";
import difference from "@turf/difference";
import intersect from "@turf/intersect";
import { multiPolygon } from "@turf/helpers";
import { point as turfPoint } from "@turf/helpers";
import { polygon as turfPolygon } from "@turf/helpers";
import simplify from "@turf/simplify";
import type { GameArea } from "../map/annotations";
import {
  boundingBoxToGameArea,
  gameAreaToBoundingBox,
  normalizeBoundingBox,
  type BoundingBox,
} from "./gameAreaBounds";

export type { BoundingBox } from "./gameAreaBounds";
export {
  boundingBoxToGameArea,
  gameAreaToBoundingBox,
  normalizeBoundingBox,
} from "./gameAreaBounds";

const ZERO_GAME_AREA_RING: number[][] = [
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
];

export const ZERO_GAME_AREA: GameArea = {
  type: "Polygon",
  coordinates: [ZERO_GAME_AREA_RING],
};

export function fallbackGameArea(gameArea?: GameArea | null): GameArea {
  return gameArea ?? ZERO_GAME_AREA;
}

export type LatLngTuple = [number, number];

const MIN_GAME_AREA_LAT_SPAN = 0.005;
const MIN_GAME_AREA_LNG_SPAN = 0.005;

export function boundingBoxHasMinimumSpan(box: BoundingBox): boolean {
  return (
    box.north - box.south >= MIN_GAME_AREA_LAT_SPAN &&
    box.east - box.west >= MIN_GAME_AREA_LNG_SPAN
  );
}

export function isUsableMapBounds(bounds: LatLngBounds): boolean {
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();

  return boundingBoxHasMinimumSpan({
    south: southWest.lat,
    west: southWest.lng,
    north: northEast.lat,
    east: northEast.lng,
  });
}

export function boundsToGameArea(bounds: LatLngBounds): GameArea {
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();

  return boundingBoxToGameArea({
    south: southWest.lat,
    west: southWest.lng,
    north: northEast.lat,
    east: northEast.lng,
  });
}

function geodesicMeters(a: LatLngTuple, b: LatLngTuple): number {
  const earthRadius = 6_371_000;
  const latDelta = ((b[0] - a[0]) * Math.PI) / 180;
  const lngDelta = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

/** Geodesic distance from center to the nearest viewport edge. */
export function centerToViewportEdgeRadiusMeters(
  center: LatLngTuple,
  bounds: LatLngBounds,
): number {
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();
  const south = southWest.lat;
  const west = southWest.lng;
  const north = northEast.lat;
  const east = northEast.lng;
  const [lat, lng] = center;

  return Math.min(
    geodesicMeters(center, [south, lng]),
    geodesicMeters(center, [north, lng]),
    geodesicMeters(center, [lat, west]),
    geodesicMeters(center, [lat, east]),
  );
}

export function circleToGameArea(
  center: LatLngTuple,
  radiusMeters: number,
): GameArea {
  const circle = turfCircle([center[1], center[0]], radiusMeters / 1000, {
    steps: 64,
    units: "kilometers",
  });

  return featureToGameArea(circle as Feature<Polygon>);
}

export function verticesToGameArea(
  vertices: readonly LatLngTuple[],
): GameArea | null {
  if (vertices.length < 3) {
    return null;
  }

  const ring = vertices.map(([lat, lng]) => [lng, lat] as [number, number]);
  ring.push(ring[0]!);

  return {
    type: "Polygon",
    coordinates: [ring],
  };
}

export function boundingBoxToLeafletBounds(box: BoundingBox): LatLngBounds {
  const normalized = normalizeBoundingBox(box);
  return latLngBounds(
    latLng(normalized.south, normalized.west),
    latLng(normalized.north, normalized.east),
  );
}

export function gameAreaToBoundsExpression(
  gameArea: GameArea,
): LatLngBoundsExpression {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  return [
    [south, west],
    [north, east],
  ];
}

export function placeToGameArea(place: {
  bounds: BoundingBox;
  boundary?: GameArea;
}): GameArea {
  return place.boundary ?? boundingBoxToGameArea(place.bounds);
}

function collectPositions(gameArea: GameArea): Position[] {
  if (gameArea.type === "MultiPolygon") {
    return gameArea.coordinates.flatMap((polygon) =>
      polygon.flatMap((ring) => ring),
    );
  }

  return gameArea.coordinates.flatMap((ring) => ring);
}

export function gameAreaToFeature(
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> {
  if (gameArea.type === "MultiPolygon") {
    return multiPolygon(gameArea.coordinates);
  }

  return turfPolygon(gameArea.coordinates);
}

export function featureToGameArea(
  feature: Feature<Polygon | MultiPolygon>,
): GameArea {
  if (feature.geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: feature.geometry.coordinates,
    };
  }

  return {
    type: "Polygon",
    coordinates: feature.geometry.coordinates,
  };
}

export function simplifyGameArea(gameArea: GameArea): GameArea {
  let tolerance = 0.0002;
  let simplified = featureToGameArea(
    simplify(gameAreaToFeature(gameArea), {
      tolerance,
      highQuality: false,
    }) as Feature<Polygon | MultiPolygon>,
  );

  while (collectPositions(simplified).length > 1_500 && tolerance < 0.01) {
    tolerance *= 1.5;
    simplified = featureToGameArea(
      simplify(gameAreaToFeature(gameArea), {
        tolerance,
        highQuality: false,
      }) as Feature<Polygon | MultiPolygon>,
    );
  }

  return simplified;
}

export function gameAreaToPolygon(
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> {
  return gameAreaToFeature(gameArea);
}

export type GameAreaLeafletPositions =
  | LatLngTuple[]
  | LatLngTuple[][]
  | LatLngTuple[][][];

export function gameAreaToLeafletPositions(
  gameArea: GameArea,
): GameAreaLeafletPositions {
  if (gameArea.type === "MultiPolygon") {
    return gameArea.coordinates.map((polygon) =>
      polygon.map((ring) =>
        ring.map(([lng, lat]) => [lat, lng] as LatLngTuple),
      ),
    );
  }

  return gameArea.coordinates.map((ring) =>
    ring.map(([lng, lat]) => [lat, lng] as LatLngTuple),
  );
}

export function gameAreaToLeafletLatLngs(gameArea: GameArea): LatLngTuple[] {
  const positions = gameAreaToLeafletPositions(gameArea);
  if (Array.isArray(positions[0]?.[0])) {
    const firstPolygon = positions[0] as LatLngTuple[][];
    return firstPolygon[0] ?? [];
  }

  return positions as LatLngTuple[];
}

export function gameAreaCenter(gameArea: GameArea): LatLngTuple {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  return [(south + north) / 2, (west + east) / 2];
}

const WORLD_OUTSIDE_MASK_BOUNDS: BoundingBox = {
  south: -85,
  west: -180,
  north: 85,
  east: 180,
};

export function gameAreaExteriorStrokeRings(gameArea: GameArea): LatLngTuple[][] {
  if (gameArea.type === "MultiPolygon") {
    return gameArea.coordinates.map(
      (polygon) =>
        (polygon[0] ?? []).map(([lng, lat]) => [lat, lng] as LatLngTuple),
    );
  }

  const exterior = gameArea.coordinates[0] ?? [];
  return [exterior.map(([lng, lat]) => [lat, lng] as LatLngTuple)];
}

export function gameAreaOutsideMask(gameArea: GameArea): GameArea | null {
  const { south, west, north, east } = WORLD_OUTSIDE_MASK_BOUNDS;
  const outer = bboxPolygon([west, south, east, north]);
  const result = safeDifference(outer, gameAreaToPolygon(gameArea));
  return result ? featureToGameArea(result) : null;
}

export function safeDifference(
  outer: Feature<Polygon | MultiPolygon>,
  inner: Feature<Polygon | MultiPolygon>,
): Feature<Polygon | MultiPolygon> | null {
  try {
    const result = difference({
      type: "FeatureCollection",
      features: [outer, inner],
    });
    if (
      !result ||
      (result.geometry.type !== "Polygon" &&
        result.geometry.type !== "MultiPolygon")
    ) {
      return null;
    }

    return result as Feature<Polygon | MultiPolygon>;
  } catch {
    return null;
  }
}

export function polygonToLeafletLatLngs(
  polygon: Feature<Polygon>,
): LatLngTuple[][] {
  const { coordinates } = polygon.geometry;

  if (polygon.geometry.type === "Polygon") {
    return coordinates.map((ring) =>
      ring.map(([lng, lat]) => [lat, lng] as LatLngTuple),
    );
  }

  return [];
}

export function midpoint(a: LatLngTuple, b: LatLngTuple): LatLngTuple {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

export function bearingDegrees(a: LatLngTuple, b: LatLngTuple): number {
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function destinationPoint(
  origin: LatLngTuple,
  distanceMeters: number,
  bearing: number,
): LatLngTuple {
  const earthRadius = 6_371_000;
  const angularDistance = distanceMeters / earthRadius;
  const bearingRad = (bearing * Math.PI) / 180;
  const lat1 = (origin[0] * Math.PI) / 180;
  const lng1 = (origin[1] * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );

  return [(lat2 * 180) / Math.PI, (lng2 * 180) / Math.PI];
}

export function buildHalfPlanePolygon(
  pointA: LatLngTuple,
  pointB: LatLngTuple,
  gameArea: GameArea,
  shadedSide: "hot" | "cold" = "cold",
  divisionAnchor: "midpoint" | "start" = "midpoint",
): Feature<Polygon | MultiPolygon> | null {
  const gameFeature = gameAreaToPolygon(gameArea);
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  const gameBbox = bboxPolygon([west, south, east, north]);

  const anchor = divisionAnchor === "start" ? pointA : midpoint(pointA, pointB);
  const bearing = bearingDegrees(pointA, pointB);
  const diagonalMeters = 250_000;
  const left = destinationPoint(anchor, diagonalMeters, bearing + 90);
  const right = destinationPoint(anchor, diagonalMeters, bearing - 90);
  const far = destinationPoint(anchor, diagonalMeters, bearing);

  const hotterSide: Position[][] = [
    [
      [anchor[1], anchor[0]],
      [left[1], left[0]],
      [far[1], far[0]],
      [right[1], right[0]],
      [anchor[1], anchor[0]],
    ],
  ];

  const colderSide =
    safeDifference(gameFeature, turfPolygon(hotterSide)) ?? gameBbox;

  if (shadedSide === "cold") {
    return colderSide;
  }

  const hotterSideFeature = intersect({
    type: "FeatureCollection",
    features: [gameFeature, turfPolygon(hotterSide)],
  });

  if (
    hotterSideFeature &&
    (hotterSideFeature.geometry.type === "Polygon" ||
      hotterSideFeature.geometry.type === "MultiPolygon")
  ) {
    return hotterSideFeature as Feature<Polygon | MultiPolygon>;
  }

  return gameBbox;
}

export function isPointInGameArea(
  point: LatLngTuple,
  gameArea: GameArea,
): boolean {
  return booleanPointInPolygon(
    turfPoint([point[1], point[0]]),
    gameAreaToFeature(gameArea),
  );
}

export function buildRadarShadedRegion(
  center: LatLngTuple,
  radiusMeters: number,
  gameArea: GameArea,
  inside: boolean,
): Feature<Polygon | MultiPolygon> | null {
  const radarCircle = turfCircle(
    turfPoint([center[1], center[0]]),
    radiusMeters / 1000,
    { steps: 64, units: "kilometers" },
  );

  if (inside) {
    return radarCircle as Feature<Polygon>;
  }

  return safeDifference(gameAreaToPolygon(gameArea), radarCircle as Feature<Polygon>);
}
