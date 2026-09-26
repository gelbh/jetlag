import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";

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
