import type { MapPathOptions } from "./mapPathOptions";
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

const ADMIN_LINE_WIDTH_ZOOM_STOPS = [4, 8, 10, 12, 14, 16, 18, 20] as const;

export type MapLibreLineWidthExpression = readonly [
  "interpolate",
  ["linear"],
  ["zoom"],
  ...number[],
];

function highContrastSurface(
  mapStyle: MapStyle,
  streetBasemap: StreetBasemap,
): boolean {
  const surface = getBasemapSurface(mapStyle, streetBasemap);
  return surface === "satellite" || surface === "dark";
}

export function getAdminBoundaryLineWidthExpression(
  adminLevel: number,
): MapLibreLineWidthExpression {
  const baseWeight = ADMIN_LEVEL_STROKE_WEIGHT[adminLevel] ?? 1;
  const stops = ADMIN_LINE_WIDTH_ZOOM_STOPS.flatMap((zoom) => [
    zoom,
    quantizeWeight(computeZoomAdaptiveWeight(baseWeight, zoom)),
  ] as const);
  return ["interpolate", ["linear"], ["zoom"], ...stops];
}

export function getAdminBoundaryStrokeStyle(
  adminLevel: number,
  mapStyle: MapStyle,
  streetBasemap: StreetBasemap = "light",
  zoom: number = ADMIN_STROKE_REF_ZOOM,
): MapPathOptions {
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
