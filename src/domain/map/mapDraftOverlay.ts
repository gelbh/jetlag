import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import type { LatLngTuple } from "../geometry/gameArea/geometry";

export interface MapDraftOverlayStyle {
  color?: string;
  weight?: number;
  dashArray?: string;
  fillColor?: string;
  fillOpacity?: number;
  opacity?: number;
  markerRadius?: number;
  pulsing?: boolean;
  /** When set, draft marker renders as a category icon pin (Matching). */
  iconCategoryId?: string;
  /** Tentacle place candidate: frosted iOS pin (selected lifts). */
  tentaclePoiSelected?: boolean;
  /** Tentacle category id for map pin glyph (museum, library, …). */
  tentacleCategoryId?: string;
}

export type MapDraftOverlay =
  | {
      kind: "marker";
      id: string;
      point: LatLngTuple;
      style?: MapDraftOverlayStyle;
      popup?: string;
    }
  | {
      kind: "circle";
      id: string;
      center: LatLngTuple;
      radiusMeters: number;
      style?: MapDraftOverlayStyle;
    }
  | {
      kind: "polygon";
      id: string;
      feature: Feature<GeoPolygon | MultiPolygon>;
      layer: "boundary" | "decoration";
      style?: MapDraftOverlayStyle;
    }
  | {
      kind: "polyline";
      id: string;
      positions: LatLngTuple[];
      style?: MapDraftOverlayStyle;
    };
