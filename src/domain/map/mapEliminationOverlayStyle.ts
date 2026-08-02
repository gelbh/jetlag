import type { MapPathOptions } from "./mapPathOptions";
import type { BasemapSurface, MapStyle, StreetBasemap } from "./mapBasemaps";
import { getBasemapSurface } from "./mapBasemaps";
import { MAP_ANNOTATION_COLORS } from "./mapAnnotationColors";

export type EliminationOverlayLayer = MapPathOptions & {
  className?: string;
  noClip?: boolean;
};

function highContrastSurface(surface: BasemapSurface): boolean {
  return surface === "satellite" || surface === "dark";
}

export function getEliminationOverlayLayers(
  mapStyle: MapStyle,
  streetBasemap: StreetBasemap = "light",
): EliminationOverlayLayer[] {
  if (highContrastSurface(getBasemapSurface(mapStyle, streetBasemap))) {
    return [
      {
        stroke: false,
        fillColor: MAP_ANNOTATION_COLORS.strokeLight,
        fillOpacity: 0.28,
      },
      {
        stroke: true,
        color: MAP_ANNOTATION_COLORS.strokeLight,
        weight: 1,
        opacity: 0.6,
        fillColor: MAP_ANNOTATION_COLORS.elimination,
        fillOpacity: 0.52,
      },
    ];
  }

  return [
    {
      stroke: false,
      fillColor: MAP_ANNOTATION_COLORS.elimination,
      fillOpacity: 0.35,
    },
  ];
}
