import type { LatLngBounds, LatLngBoundsExpression } from "leaflet";
import { latLng, latLngBounds } from "leaflet";
import type { Feature, MultiPolygon, Polygon, Position } from "geojson";
import bboxPolygon from "@turf/bbox-polygon";
import turfCircle from "@turf/circle";
import simplify from "@turf/simplify";
import type { GameArea } from "../../map/annotations";
import {
  boundingBoxToGameArea,
  gameAreaToBoundingBox,
  normalizeBoundingBox,
  type BoundingBox,
} from "../gameAreaBounds";
import {
  MIN_GAME_AREA_LAT_SPAN,
  MIN_GAME_AREA_LNG_SPAN,
} from "../gameAreaConstants";
import { featureToGameArea, gameAreaToFeature } from "./featureConvert";
import { safeDifference } from "./geodesicPrimitives";
import type { GameAreaLeafletPositions, LatLngTuple } from "./types";

export type { BoundingBox } from "../gameAreaBounds";
export {
  boundingBoxToGameArea,
  gameAreaToBoundingBox,
  normalizeBoundingBox,
} from "../gameAreaBounds";

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

export function gameAreaFingerprint(gameArea: GameArea): string {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  const coordCount =
    gameArea.type === "MultiPolygon"
      ? gameArea.coordinates.reduce(
          (sum, polygon) =>
            sum + polygon.reduce((ringSum, ring) => ringSum + ring.length, 0),
          0,
        )
      : gameArea.coordinates.reduce((sum, ring) => sum + ring.length, 0);

  return `${gameArea.type}:${south.toFixed(5)}:${west.toFixed(5)}:${north.toFixed(5)}:${east.toFixed(5)}:${coordCount}`;
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
      simplify(gameAreaToFeature(simplified), {
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

export function gameAreaWithoutInteriorRings(gameArea: GameArea): GameArea {
  if (gameArea.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: gameArea.coordinates.map((polygon) => [polygon[0]!]),
    };
  }

  return {
    type: "Polygon",
    coordinates: [gameArea.coordinates[0]!],
  };
}

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

export { featureToGameArea, gameAreaToFeature } from "./featureConvert";
export {
  bearingDegrees,
  centerToViewportEdgeRadiusMeters,
  destinationPoint,
  midpoint,
  safeDifference,
} from "./geodesicPrimitives";
export {
  buildHalfPlanePolygon,
  buildRadarShadedRegion,
  isPointInGameArea,
} from "./radarHalfPlane";
export type { GameAreaLeafletPositions, LatLngTuple } from "./types";
