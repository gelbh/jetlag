import { useMemo } from "react";
import type { ExpressionSpecification } from "maplibre-gl";
import { MapLibreGeoJsonOverlay } from "./MapLibreGeoJsonOverlay";
import {
  circleMarkerCollection,
  type CircleMarkerProps,
} from "./mapMarkerFeatures";
import { jlMarkerLayerId } from "./mapMarkerConstants";

const DATA_CIRCLE_PAINT = {
  radius: ["get", "radiusPx"],
  color: ["get", "fillColor"],
  strokeColor: ["get", "borderColor"],
  strokeWidth: ["get", "borderWidth"],
  opacity: ["get", "opacity"],
} satisfies {
  radius: ExpressionSpecification;
  color: ExpressionSpecification;
  strokeColor: ExpressionSpecification;
  strokeWidth: ExpressionSpecification;
  opacity: ExpressionSpecification;
};

interface MapLibrePointMarkersProps {
  /** Suffix after jl-marker- when interactive; bare id when not. */
  id: string;
  markers: readonly CircleMarkerProps[];
  interactive?: boolean;
  beforeId?: string;
}

/** Renders point features as a single circle GL layer. */
export function MapLibrePointMarkers({
  id,
  markers,
  interactive = false,
  beforeId,
}: MapLibrePointMarkersProps) {
  const data = useMemo(() => circleMarkerCollection(markers), [markers]);
  const overlayId = interactive ? jlMarkerLayerId(id) : id;

  if (markers.length === 0) {
    return null;
  }

  return (
    <MapLibreGeoJsonOverlay
      id={overlayId}
      data={data}
      circle={DATA_CIRCLE_PAINT}
      beforeId={beforeId}
    />
  );
}
