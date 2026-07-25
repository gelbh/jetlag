import type { Feature, MultiPolygon, Polygon } from "geojson";
import { multiPolygon, polygon as turfPolygon } from "@turf/helpers";
import type { GameAreaGeometry } from "./types";

export function gameAreaGeometryToFeature(
  gameArea: GameAreaGeometry,
): Feature<Polygon | MultiPolygon> {
  if (gameArea.type === "MultiPolygon") {
    return multiPolygon(gameArea.coordinates);
  }

  return turfPolygon(gameArea.coordinates);
}

export function featureToGameAreaGeometry(
  feature: Feature<Polygon | MultiPolygon>,
): GameAreaGeometry {
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
