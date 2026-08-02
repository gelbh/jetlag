import { useEffect, useRef, type MutableRefObject } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import {
  latLngBoundsToViewport,
  type MapViewportBounds,
} from "../../../domain/map/transitViewport";
import { createThrottledPublisher } from "../helpers/mapViewportPublish";

/** Mid-gesture viewport policy: schedule on move/zoom; flush on settle. */
export function viewportPublishActionForEvent(
  phase: "move" | "zoom" | "moveend" | "dragend" | "zoomend",
): "schedule" | "flush" {
  if (phase === "dragend" || phase === "zoomend") {
    return "flush";
  }
  return "schedule";
}

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
  const onViewportChangeRef = useRef(onViewportChange);
  const publisherRef = useRef<ReturnType<typeof createThrottledPublisher> | null>(
    null,
  );

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    const publisher = createThrottledPublisher(() => {
      publishViewport(map, onViewportChangeRef.current);
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
      if (viewportPublishActionForEvent("dragend") === "flush") {
        publisherRef.current?.flush();
      }
    },
    move: () => {
      if (viewportPublishActionForEvent("move") === "schedule") {
        publisherRef.current?.schedule();
      }
    },
    zoom: () => {
      if (viewportPublishActionForEvent("zoom") === "schedule") {
        publisherRef.current?.schedule();
      }
    },
    moveend: () => {
      notifyPanEnd();
      if (viewportPublishActionForEvent("moveend") === "schedule") {
        publisherRef.current?.schedule();
      }
    },
    zoomend: () => {
      if (viewportPublishActionForEvent("zoomend") === "flush") {
        publisherRef.current?.flush();
      }
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
