import type { Feature, Polygon as GeoPolygon, LineString, MultiPolygon } from "geojson";

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

export type GameAreaGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export type NearRegionBatchInput = {
  segments: readonly Feature<LineString>[];
  distanceMeters: number;
  disks: readonly DiskSpec[];
  gameArea: GameAreaGeometry;
  mode?: "distanceThreshold" | "bufferUnion";
  divisions?: number;
};
