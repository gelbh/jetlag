import intersect from "@turf/intersect";
import { gameAreaGeometryToFeature } from "./featureConvert";
import type { GameAreaGeometry, PolygonFeature } from "./types";

function polygonParts(mask: PolygonFeature): PolygonFeature[] {
  if (mask.geometry.type === "Polygon") {
    return [mask];
  }

  return mask.geometry.coordinates.map((coordinates) => ({
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates },
  }));
}

function concatClippedParts(parts: PolygonFeature[]): PolygonFeature {
  const coordinates = parts.flatMap((part) =>
    part.geometry.type === "Polygon"
      ? [part.geometry.coordinates]
      : part.geometry.coordinates,
  );
  const first = coordinates[0];
  if (coordinates.length === 1 && first) {
    return {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: first },
    };
  }

  return {
    type: "Feature",
    properties: {},
    geometry: { type: "MultiPolygon", coordinates },
  };
}

function clipPolygonToGameArea(
  mask: PolygonFeature,
  gameFeature: PolygonFeature,
): PolygonFeature | null {
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

export function clipMaskToGameArea(
  mask: PolygonFeature,
  gameArea: GameAreaGeometry,
): PolygonFeature | null {
  const gameFeature = gameAreaGeometryToFeature(gameArea) as PolygonFeature;
  // Union concat can emit overlapping/invalid MultiPolygons. One failed
  // intersect used to null the whole committed shade.
  const clippedParts: PolygonFeature[] = [];
  for (const part of polygonParts(mask)) {
    const clipped = clipPolygonToGameArea(part, gameFeature);
    if (clipped) {
      clippedParts.push(clipped);
    }
  }

  if (clippedParts.length === 0) {
    return null;
  }

  if (clippedParts.length === 1) {
    return clippedParts[0] ?? null;
  }

  return concatClippedParts(clippedParts);
}
