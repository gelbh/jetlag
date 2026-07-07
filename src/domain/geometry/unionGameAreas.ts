import union from "@turf/union";
import { featureCollection } from "@turf/helpers";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import type { GameArea } from "../map/annotations";
import { gameAreaToBoundingBox, normalizeBoundingBox } from "./gameAreaBounds";

function gameAreaToFeature(
  gameArea: GameArea,
): Feature<GeoPolygon | MultiPolygon> {
  return {
    type: "Feature",
    properties: {},
    geometry: gameArea,
  };
}

export function unionGameAreas(areas: readonly GameArea[]): GameArea {
  if (areas.length === 0) {
    throw new Error("At least one game area is required.");
  }

  if (areas.length === 1) {
    return areas[0]!;
  }

  let combined = gameAreaToFeature(areas[0]!);

  for (let index = 1; index < areas.length; index += 1) {
    const next = gameAreaToFeature(areas[index]!);
    const merged = union(featureCollection([combined, next]));
    if (
      merged &&
      (merged.geometry.type === "Polygon" ||
        merged.geometry.type === "MultiPolygon")
    ) {
      combined = merged as Feature<GeoPolygon | MultiPolygon>;
    }
  }

  const geometry = combined.geometry;
  if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") {
    const box = normalizeBoundingBox(
      areas.reduce(
        (acc, area) => {
          const next = gameAreaToBoundingBox(area);
          return {
            south: Math.min(acc.south, next.south),
            west: Math.min(acc.west, next.west),
            north: Math.max(acc.north, next.north),
            east: Math.max(acc.east, next.east),
          };
        },
        gameAreaToBoundingBox(areas[0]!),
      ),
    );

    return {
      type: "Polygon",
      coordinates: [
        [
          [box.west, box.south],
          [box.east, box.south],
          [box.east, box.north],
          [box.west, box.north],
          [box.west, box.south],
        ],
      ],
    };
  }

  return geometry;
}
