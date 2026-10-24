import type { Feature, Polygon as GeoPolygon, MultiPolygon } from "geojson";
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
  iconCategoryId?: string;
  /** Tentacle place candidate: frosted iOS pin (selected lifts). */
  tentaclePoiSelected?: boolean;
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
