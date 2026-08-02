import { useEffect, useRef, type MutableRefObject } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import type { MapRef } from "react-map-gl/maplibre";
import {
  latLngBoundsToViewport,
  type MapViewportBounds,
} from "../../../domain/map/transitViewport";
import { createViewportTrackerHandlers } from "../helpers/createViewportTrackerHandlers";
import { useMapLibreMap } from "../helpers/useMapLibreMap";
import { matchMapEngine } from "./matchMapEngine";
import { useMapEngine } from "./mapEngineContext";

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

function MapViewportTrackerMapLibre({
  onViewportChange,
  onUserPanStart,
  onUserPanEnd,
  suppressPanRef,
}: MapViewportTrackerProps) {
  const map = useMapLibreMap();
  const onViewportChangeRef = useRef(onViewportChange);

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    const handlers = createViewportTrackerHandlers({
      publish: () =>
        publishViewportMapLibre(map, onViewportChangeRef.current),
      onUserPanStart,
      onUserPanEnd,
      suppressPanRef,
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
      handlers.disposePublisher();
    };
  }, [map, onUserPanStart, onUserPanEnd, suppressPanRef]);

  useEffect(() => {
    publishViewportMapLibre(map, onViewportChange);
  }, [map, onViewportChange]);

  return null;
}

function MapViewportTrackerLeaflet({
  onViewportChange,
  onUserPanStart,
  onUserPanEnd,
  suppressPanRef,
}: MapViewportTrackerProps) {
  const map = useMap();
  const onViewportChangeRef = useRef(onViewportChange);
  const handlersRef = useRef<ReturnType<
    typeof createViewportTrackerHandlers
  > | null>(null);

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    const handlers = createViewportTrackerHandlers({
      publish: () =>
        publishViewportLeaflet(map, onViewportChangeRef.current),
      onUserPanStart,
      onUserPanEnd,
      suppressPanRef,
    });
    handlersRef.current = handlers;
    return () => {
      handlers.disposePublisher();
      handlersRef.current = null;
    };
  }, [map, onUserPanStart, onUserPanEnd, suppressPanRef]);

  useMapEvents({
    dragstart: () => {
      handlersRef.current?.onDragStart();
    },
    dragend: () => {
      handlersRef.current?.onDragEnd();
    },
    move: () => {
      handlersRef.current?.onMove();
    },
    zoom: () => {
      handlersRef.current?.onZoom();
    },
    moveend: () => {
      handlersRef.current?.onMoveEnd();
    },
    zoomend: () => {
      handlersRef.current?.onZoomEnd();
    },
  });

  useEffect(() => {
    publishViewportLeaflet(map, onViewportChange);
  }, [map, onViewportChange]);

  return null;
}

export function MapViewportTracker(props: MapViewportTrackerProps) {
  const engine = useMapEngine();
  return matchMapEngine(engine, {
    maplibre: () => <MapViewportTrackerMapLibre {...props} />,
    leaflet: () => <MapViewportTrackerLeaflet {...props} />,
  });
}

function publishViewportLeaflet(
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
