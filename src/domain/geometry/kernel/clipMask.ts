import intersect from "@turf/intersect";
import { gameAreaGeometryToFeature } from "./featureConvert";
import type { GameAreaGeometry, PolygonFeature } from "./types";

export function clipMaskToGameArea(
  mask: PolygonFeature,
  gameArea: GameAreaGeometry,
): PolygonFeature | null {
  const gameFeature = gameAreaGeometryToFeature(gameArea) as PolygonFeature;

  try {
    const clipped = intersect({
      type: "FeatureCollection",
      features: [gameFeature, mask],
    });

    if (
      clipped &&
      (clipped.geometry.type === "Polygon" ||
        clipped.geometry.type === "MultiPolygon")
    ) {
      return clipped as PolygonFeature;
    }
  } catch {
    return null;
  }

  return null;
}
