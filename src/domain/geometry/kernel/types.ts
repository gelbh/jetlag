import type { Feature, LineString, MultiPolygon, Polygon as GeoPolygon } from "geojson";

export type LatLngTuple = [number, number];

export type PolygonFeature = Feature<GeoPolygon | MultiPolygon>;

export interface DiskSpec {
  center: LatLngTuple;
  radiusMeters: number;
}

export interface EliminationUnionInput {
  polygons: PolygonFeature[];
  disks: DiskSpec[];
}

/** Structurally identical to map `GameArea`. */
export type GameAreaGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

/** Near-region batch input for the kernel wasm / TS dispatch path. */
export type NearRegionBatchInput = {
  segments: readonly Feature<LineString>[];
  distanceMeters: number;
  disks: readonly DiskSpec[];
  gameArea: GameAreaGeometry;
};
