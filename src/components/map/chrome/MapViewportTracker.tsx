import { useEffect, useRef, type MutableRefObject } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import type { MapRef } from "react-map-gl/maplibre";
import {
  latLngBoundsToViewport,
  type MapViewportBounds,
} from "../../../domain/map/transitViewport";
import { createThrottledPublisher } from "../helpers/mapViewportPublish";
import { useMapLibreMap } from "../helpers/useMapLibreMap";
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
  const panActiveRef = useRef(false);
  const skipMoveEndScheduleRef = useRef(false);
  const onViewportChangeRef = useRef(onViewportChange);
  const publisherRef = useRef<ReturnType<typeof createThrottledPublisher> | null>(
    null,
  );

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    const publisher = createThrottledPublisher(() => {
      publishViewportMapLibre(map, onViewportChangeRef.current);
    });
    publisherRef.current = publisher;
    return () => {
      publisher.cancel();
      publisherRef.current = null;
    };
  }, [map]);

  useEffect(() => {
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

    const onDragStart = () => {
      notifyPanStart();
    };
    const onDragEnd = () => {
      notifyPanEnd();
      publisherRef.current?.flush();
      skipMoveEndScheduleRef.current = true;
    };
    const onMove = () => {
      publisherRef.current?.schedule();
    };
    const onZoom = () => {
      publisherRef.current?.schedule();
    };
    const onMoveEnd = () => {
      notifyPanEnd();
      if (skipMoveEndScheduleRef.current) {
        skipMoveEndScheduleRef.current = false;
        return;
      }
      publisherRef.current?.schedule();
    };
    const onZoomEnd = () => {
      skipMoveEndScheduleRef.current = true;
      publisherRef.current?.flush();
    };

    map.on("dragstart", onDragStart);
    map.on("dragend", onDragEnd);
    map.on("move", onMove);
    map.on("zoom", onZoom);
    map.on("moveend", onMoveEnd);
    map.on("zoomend", onZoomEnd);

    return () => {
      map.off("dragstart", onDragStart);
      map.off("dragend", onDragEnd);
      map.off("move", onMove);
      map.off("zoom", onZoom);
      map.off("moveend", onMoveEnd);
      map.off("zoomend", onZoomEnd);
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
  const panActiveRef = useRef(false);
  const skipMoveEndScheduleRef = useRef(false);
  const onViewportChangeRef = useRef(onViewportChange);
  const publisherRef = useRef<ReturnType<typeof createThrottledPublisher> | null>(
    null,
  );

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    const publisher = createThrottledPublisher(() => {
      publishViewportLeaflet(map, onViewportChangeRef.current);
    });
    publisherRef.current = publisher;
    return () => {
      publisher.cancel();
      publisherRef.current = null;
    };
  }, [map]);

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
      publisherRef.current?.flush();
      skipMoveEndScheduleRef.current = true;
    },
    move: () => {
      publisherRef.current?.schedule();
    },
    zoom: () => {
      publisherRef.current?.schedule();
    },
    moveend: () => {
      notifyPanEnd();
      if (skipMoveEndScheduleRef.current) {
        skipMoveEndScheduleRef.current = false;
        return;
      }
      publisherRef.current?.schedule();
    },
    zoomend: () => {
      skipMoveEndScheduleRef.current = true;
      publisherRef.current?.flush();
    },
  });

  useEffect(() => {
    publishViewportLeaflet(map, onViewportChange);
  }, [map, onViewportChange]);

  return null;
}

export function MapViewportTracker(props: MapViewportTrackerProps) {
  const engine = useMapEngine();
  if (engine === "maplibre") {
    return <MapViewportTrackerMapLibre {...props} />;
  }
  return <MapViewportTrackerLeaflet {...props} />;
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
