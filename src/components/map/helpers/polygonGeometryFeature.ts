import type { Feature, MultiPolygon, Polygon } from "geojson";

export function polygonGeometryFeature(
  geometry: Polygon | MultiPolygon,
): Feature<Polygon | MultiPolygon> {
  return { type: "Feature", properties: {}, geometry };
}
