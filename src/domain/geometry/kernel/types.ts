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

/** Plain play-area polygon; structurally identical to map `GameArea`. */
export type GameAreaGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };
