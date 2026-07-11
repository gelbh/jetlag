import type { Feature, MultiPolygon, Polygon, Position } from "geojson";
import bboxPolygon from "@turf/bbox-polygon";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import turfCircle from "@turf/circle";
import intersect from "@turf/intersect";
import { point as turfPoint } from "@turf/helpers";
import { polygon as turfPolygon } from "@turf/helpers";
import type { GameArea } from "../../map/annotations";
import { gameAreaToBoundingBox } from "../gameAreaBounds";
import {
  gameAreaToFeature,
  gameAreaToPolygon,
} from "./gameAreaConvert";
import {
  bearingDegrees,
  destinationPoint,
  midpoint,
  safeDifference,
} from "./geodesicPrimitives";
import type { LatLngTuple } from "./types";

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
