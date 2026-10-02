import type { Feature, Polygon as GeoPolygon, MultiPolygon } from "geojson";

export const EMPTY_GEOJSON_FEATURES = [] as const as readonly Feature<GeoPolygon | MultiPolygon>[];
