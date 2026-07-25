import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { GameArea } from "../../map/annotations";
import {
  featureToGameAreaGeometry,
  gameAreaGeometryToFeature,
} from "../kernel/featureConvert";

export function gameAreaToFeature(
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> {
  return gameAreaGeometryToFeature(gameArea);
}

export function featureToGameArea(
  feature: Feature<Polygon | MultiPolygon>,
): GameArea {
  return featureToGameAreaGeometry(feature);
}
