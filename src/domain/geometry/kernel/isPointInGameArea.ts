import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import { gameAreaGeometryToFeature } from "./featureConvert";
import type { GameAreaGeometry, LatLngTuple } from "./types";

export function isPointInGameArea(point: LatLngTuple, gameArea: GameAreaGeometry): boolean {
  return booleanPointInPolygon(
    turfPoint([point[1], point[0]]),
    gameAreaGeometryToFeature(gameArea),
  );
}
