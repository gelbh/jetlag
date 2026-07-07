import type { PathOptions } from "leaflet";
import type { MapStyle } from "./mapBasemaps";
import { MAP_ANNOTATION_COLORS } from "./mapAnnotationColors";

export type EliminationOverlayLayer = PathOptions & {
  className?: string;
};

export function getEliminationOverlayLayers(
  mapStyle: MapStyle,
): EliminationOverlayLayer[] {
  if (mapStyle === "satellite") {
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
