import { useEffect, useRef } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import type { MapViewportBounds } from "../../../domain/map/transitViewport";
import { createViewportTrackerHandlers } from "../helpers/createViewportTrackerHandlers";
import { useMapLibreMap } from "../helpers/useMapLibreMap";

export interface MapViewportState {
  bounds: MapViewportBounds;
  zoom: number;
}

interface MapViewportTrackerProps {
  onViewportChange: (viewport: MapViewportState | null) => void;
  onUserPanStart?: () => void;
  onUserPanEnd?: () => void;
}

function publishViewportMapLibre(
  map: MapRef,
  onViewportChange: (viewport: MapViewportState | null) => void,
) {
  const bounds = map.getBounds();
  const south = bounds.getSouth();
  const west = bounds.getWest();
  const north = bounds.getNorth();
  const east = bounds.getEast();

  if (
    !Number.isFinite(south) ||
    !Number.isFinite(west) ||
    !Number.isFinite(north) ||
    !Number.isFinite(east)
  ) {
    onViewportChange(null);
    return;
  }

  onViewportChange({
    bounds: { south, west, north, east },
    zoom: map.getZoom(),
  });
}

export function MapViewportTracker({
  onViewportChange,
  onUserPanStart,
  onUserPanEnd,
}: MapViewportTrackerProps) {
  const map = useMapLibreMap();
  const onViewportChangeRef = useRef(onViewportChange);
  const onUserPanStartRef = useRef(onUserPanStart);
  const onUserPanEndRef = useRef(onUserPanEnd);

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    onUserPanStartRef.current = onUserPanStart;
  }, [onUserPanStart]);

  useEffect(() => {
    onUserPanEndRef.current = onUserPanEnd;
  }, [onUserPanEnd]);

  useEffect(() => {
    const handlers = createViewportTrackerHandlers({
      publish: () =>
        publishViewportMapLibre(map, onViewportChangeRef.current),
      onUserPanStart: () => onUserPanStartRef.current?.(),
      onUserPanEnd: () => onUserPanEndRef.current?.(),
    });

    map.on("dragstart", handlers.onDragStart);
    map.on("dragend", handlers.onDragEnd);
    map.on("move", handlers.onMove);
    map.on("zoom", handlers.onZoom);
    map.on("moveend", handlers.onMoveEnd);
    map.on("zoomend", handlers.onZoomEnd);

    return () => {
      map.off("dragstart", handlers.onDragStart);
      map.off("dragend", handlers.onDragEnd);
      map.off("move", handlers.onMove);
      map.off("zoom", handlers.onZoom);
      map.off("moveend", handlers.onMoveEnd);
      map.off("zoomend", handlers.onZoomEnd);
      // Ends an in-flight pan so React mapPanning cannot stick across remount.
      handlers.disposePublisher();
    };
    // Callbacks are read via refs so mid-gesture identity churn cannot drop pan end.
  }, [map]);

  useEffect(() => {
    publishViewportMapLibre(map, onViewportChange);
  }, [map, onViewportChange]);

  return null;
}
