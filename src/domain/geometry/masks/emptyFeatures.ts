import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";

export const EMPTY_GEOJSON_FEATURES = [] as const as readonly Feature<
  GeoPolygon | MultiPolygon
>[];
