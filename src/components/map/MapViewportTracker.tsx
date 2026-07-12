import { useEffect, useRef, type MutableRefObject } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import {
  latLngBoundsToViewport,
  type MapViewportBounds,
} from "../../domain/map/transitViewport";

export interface MapViewportState {
  bounds: MapViewportBounds;
  zoom: number;
}

interface MapViewportTrackerProps {
  onViewportChange: (viewport: MapViewportState | null) => void;
  onUserPanStart?: () => void;
  onUserPanEnd?: () => void;
  suppressPanRef?: MutableRefObject<boolean>;
}

export function MapViewportTracker({
  onViewportChange,
  onUserPanStart,
  onUserPanEnd,
  suppressPanRef,
}: MapViewportTrackerProps) {
  const map = useMap();
  const panActiveRef = useRef(false);

  const notifyPanStart = () => {
    if (suppressPanRef?.current || panActiveRef.current) {
      return;
    }

    panActiveRef.current = true;
    onUserPanStart?.();
  };

  const notifyPanEnd = () => {
    if (!panActiveRef.current) {
      return;
    }

    panActiveRef.current = false;
    onUserPanEnd?.();
  };

  useMapEvents({
    dragstart: () => {
      notifyPanStart();
    },
    dragend: () => {
      notifyPanEnd();
    },
    moveend: () => {
      notifyPanEnd();
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
