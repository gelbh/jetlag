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

export const VIEWPORT_PUBLISH_THROTTLE_MS = 200;

interface MapViewportTrackerProps {
  onViewportChange: (viewport: MapViewportState | null) => void;
  onUserPanStart?: () => void;
  onUserPanEnd?: () => void;
  suppressPanRef?: MutableRefObject<boolean>;
}

export function createThrottledPublisher(
  publish: () => void,
  throttleMs: number = VIEWPORT_PUBLISH_THROTTLE_MS,
): {
  schedule: () => void;
  flush: () => void;
  cancel: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    schedule() {
      if (timer != null) {
        return;
      }
      timer = setTimeout(() => {
        timer = null;
        publish();
      }, throttleMs);
    },
    flush() {
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
      publish();
    },
    cancel() {
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}

export function MapViewportTracker({
  onViewportChange,
  onUserPanStart,
  onUserPanEnd,
  suppressPanRef,
}: MapViewportTrackerProps) {
  const map = useMap();
  const panActiveRef = useRef(false);
  const draggingRef = useRef(false);
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;

  const publisherRef = useRef(
    createThrottledPublisher(() => {
      publishViewport(map, onViewportChangeRef.current);
    }),
  );

  useEffect(() => {
    publisherRef.current = createThrottledPublisher(() => {
      publishViewport(map, onViewportChangeRef.current);
    });
    return () => {
      publisherRef.current.cancel();
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
      draggingRef.current = true;
      notifyPanStart();
    },
    dragend: () => {
      draggingRef.current = false;
      notifyPanEnd();
      publisherRef.current.flush();
    },
    move: () => {
      if (draggingRef.current) {
        publisherRef.current.schedule();
      }
    },
    moveend: () => {
      notifyPanEnd();
      publisherRef.current.schedule();
    },
    zoomend: () => {
      publisherRef.current.flush();
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
