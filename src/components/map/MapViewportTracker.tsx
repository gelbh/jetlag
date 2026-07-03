import { useEffect } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import {
  latLngBoundsToViewport,
  type MapViewportBounds,
} from "../../domain/transitViewport";

export interface MapViewportState {
  bounds: MapViewportBounds;
  zoom: number;
}

interface MapViewportTrackerProps {
  onViewportChange: (viewport: MapViewportState | null) => void;
}

export function MapViewportTracker({ onViewportChange }: MapViewportTrackerProps) {
  const map = useMap();

  useMapEvents({
    moveend: () => {
      publishViewport(map, onViewportChange);
    },
    zoomend: () => {
      publishViewport(map, onViewportChange);
    },
  });

  useEffect(() => {
    publishViewport(map, onViewportChange);
  }, [map, onViewportChange]);

  return null;
}

function publishViewport(
  map: LeafletMap,
  onViewportChange: (viewport: MapViewportState | null) => void,
) {
  const bounds = map.getBounds();
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();

  if (
    !Number.isFinite(southWest.lat) ||
    !Number.isFinite(southWest.lng) ||
    !Number.isFinite(northEast.lat) ||
    !Number.isFinite(northEast.lng)
  ) {
    onViewportChange(null);
    return;
  }

  onViewportChange({
    bounds: latLngBoundsToViewport(bounds),
    zoom: map.getZoom(),
  });
}
