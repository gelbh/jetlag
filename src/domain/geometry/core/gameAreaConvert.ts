import {
  boundingBoxToBoundsExpression,
  createMapBounds,
  normalizeBoundsExpression,
  type MapBounds,
  type MapBoundsExpression,
} from "../../map/mapBounds";
import type { Feature, MultiPolygon, Polygon, Position } from "geojson";
import bboxPolygon from "@turf/bbox-polygon";
import turfCircle from "@turf/circle";
import simplify from "@turf/simplify";
import type { GameArea } from "../../map/annotations";
import {
  boundingBoxToGameArea,
  gameAreaToBoundingBox,
  type BoundingBox,
} from "../gameArea/gameAreaBounds";
import {
  MIN_GAME_AREA_LAT_SPAN,
  MIN_GAME_AREA_LNG_SPAN,
} from "../gameArea/gameAreaConstants";
import { featureToGameArea, gameAreaToFeature } from "./featureConvert";
import { safeDifference } from "./geodesicPrimitives";
import type { LatLngTuple } from "./types";

export type { BoundingBox } from "../gameArea/gameAreaBounds";
export {
  boundingBoxToGameArea,
  gameAreaToBoundingBox,
  normalizeBoundingBox,
} from "../gameArea/gameAreaBounds";

/** Null-island placeholder ring — never frame the camera on this alone. */
const ZERO_GAME_AREA_RING: number[][] = [
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
];

/** Documented zero fallback when a caller omits gameArea; detect via isPlaceholderGameArea. */
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

export function isUsableMapBounds(bounds: MapBounds): boolean {
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();

  return boundingBoxHasMinimumSpan({
    south: southWest.lat,
    west: southWest.lng,
    north: northEast.lat,
    east: northEast.lng,
  });
}

export function boundsToGameArea(bounds: MapBounds): GameArea {
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

export function boundingBoxToMapBounds(box: BoundingBox): MapBounds {
  return createMapBounds(normalizeBoundsExpression(boundingBoxToBoundsExpression(box)));
}

export function gameAreaToBoundsExpression(
  gameArea: GameArea,
): MapBoundsExpression {
  return boundingBoxToBoundsExpression(gameAreaToBoundingBox(gameArea));
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

export function gameAreaCenter(gameArea: GameArea): LatLngTuple {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  return [(south + north) / 2, (west + east) / 2];
}

/** WebMercator-safe latitude clamp (MapLibre world mask). */
const OUTSIDE_MASK_LAT_LIMIT = 85;
/**
 * Pad factor / floor for the outside-mask outer ring. Full-world rings
 * (`±180×±85`) often fail to paint in MapLibre; a local padded bbox does.
 */
const OUTSIDE_MASK_PAD_FACTOR = 4;
const OUTSIDE_MASK_MIN_PAD_DEG = 12;

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

export function gameAreaOutsideMaskOuterBounds(gameArea: GameArea): BoundingBox {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  const latPad = Math.max(
    (north - south) * OUTSIDE_MASK_PAD_FACTOR,
    OUTSIDE_MASK_MIN_PAD_DEG,
  );
  const lngPad = Math.max(
    (east - west) * OUTSIDE_MASK_PAD_FACTOR,
    OUTSIDE_MASK_MIN_PAD_DEG,
  );
  return {
    south: Math.max(south - latPad, -OUTSIDE_MASK_LAT_LIMIT),
    west: Math.max(west - lngPad, -180),
    north: Math.min(north + latPad, OUTSIDE_MASK_LAT_LIMIT),
    east: Math.min(east + lngPad, 180),
  };
}

export function gameAreaOutsideMask(gameArea: GameArea): GameArea | null {
  const { south, west, north, east } = gameAreaOutsideMaskOuterBounds(gameArea);
  const outer = bboxPolygon([west, south, east, north]);
  const result = safeDifference(outer, gameAreaToPolygon(gameArea));
  return result ? featureToGameArea(result) : null;
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
export type { LatLngTuple } from "./types";
