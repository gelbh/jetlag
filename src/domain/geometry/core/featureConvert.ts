import type { Feature, MultiPolygon, Polygon } from "geojson";
import { multiPolygon } from "@turf/helpers";
import { polygon as turfPolygon } from "@turf/helpers";
import type { GameArea } from "../../map/annotations";

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
