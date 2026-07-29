import type { PathOptions } from "leaflet";
import type { MapStyle, StreetBasemap } from "./mapBasemaps";
import { getBasemapSurface } from "./mapBasemaps";
import type { MapDraftOverlayStyle } from "./mapDraftOverlay";
import { MAP_ANNOTATION_COLORS } from "./mapAnnotationColors";
import {
  computeZoomAdaptiveWeight,
  quantizeWeight,
} from "./zoomAdaptiveStrokeWeight";

const ADMIN_LEVEL_STROKE_WEIGHT: Record<number, number> = {
  4: 2.5,
  6: 2,
  8: 1.5,
  9: 1,
};

const ADMIN_LEVEL_STROKE_OPACITY: Record<number, number> = {
  4: 0.9,
  6: 0.75,
  8: 0.58,
  9: 0.42,
};

/** Reference zoom for admin stroke base weights (matches useZoomAdaptiveWeight). */
const ADMIN_STROKE_REF_ZOOM = 12;

function highContrastSurface(
  mapStyle: MapStyle,
  streetBasemap: StreetBasemap,
): boolean {
  const surface = getBasemapSurface(mapStyle, streetBasemap);
  return surface === "satellite" || surface === "dark";
}

export function getAdminBoundaryStrokeStyle(
  adminLevel: number,
  mapStyle: MapStyle,
  streetBasemap: StreetBasemap = "light",
  zoom: number = ADMIN_STROKE_REF_ZOOM,
): PathOptions {
  const baseWeight = ADMIN_LEVEL_STROKE_WEIGHT[adminLevel] ?? 1;
  const weight = quantizeWeight(computeZoomAdaptiveWeight(baseWeight, zoom));
  const opacity = ADMIN_LEVEL_STROKE_OPACITY[adminLevel] ?? 0.5;
  const color = highContrastSurface(mapStyle, streetBasemap)
    ? MAP_ANNOTATION_COLORS.strokeLight
    : MAP_ANNOTATION_COLORS.boundary;

  return {
    color,
    weight,
    opacity,
    fill: false,
  };
}

export function getBoundaryPreviewStyle(
  mapStyle: MapStyle,
  streetBasemap: StreetBasemap = "light",
): MapDraftOverlayStyle {
  if (highContrastSurface(mapStyle, streetBasemap)) {
    return {
      color: MAP_ANNOTATION_COLORS.strokeLight,
      fillColor: MAP_ANNOTATION_COLORS.strokeLight,
      fillOpacity: 0.12,
      weight: 1,
    };
  }

  return {
    color: MAP_ANNOTATION_COLORS.boundary,
    fillColor: MAP_ANNOTATION_COLORS.boundary,
    fillOpacity: 0.15,
    weight: 0,
  };
}
