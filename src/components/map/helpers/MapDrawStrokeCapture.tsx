import type { MapMouseEvent, MapTouchEvent } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { useMapLibreMap } from "../helpers/useMapLibreMap";

type StrokeHandlers = {
  enabled: boolean;
  onBegin: (lat: number, lng: number) => void;
  onExtend: (lat: number, lng: number) => void;
  onEnd: () => void;
};

/**
 * Captures freehand strokes on the MapLibre canvas while `enabled`.
 * Disables drag-pan for the gesture so the stroke owns the pointer.
 */
export function MapDrawStrokeCapture({ enabled, onBegin, onExtend, onEnd }: StrokeHandlers) {
  const map = useMapLibreMap();
  const drawingRef = useRef(false);
  const handlersRef = useRef({ onBegin, onExtend, onEnd });

  useEffect(() => {
    handlersRef.current = { onBegin, onExtend, onEnd };
  }, [onBegin, onExtend, onEnd]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const begin = (lat: number, lng: number) => {
      drawingRef.current = true;
      map.dragPan.disable();
      handlersRef.current.onBegin(lat, lng);
    };

    const extend = (lat: number, lng: number) => {
      if (!drawingRef.current) {
        return;
      }
      handlersRef.current.onExtend(lat, lng);
    };

    const end = () => {
      if (!drawingRef.current) {
        return;
      }
      drawingRef.current = false;
      map.dragPan.enable();
      handlersRef.current.onEnd();
    };

    const onMouseDown = (event: MapMouseEvent) => {
      if (event.originalEvent.button !== 0) {
        return;
      }
      begin(event.lngLat.lat, event.lngLat.lng);
    };
    const onMouseMove = (event: MapMouseEvent) => {
      extend(event.lngLat.lat, event.lngLat.lng);
    };
    const onTouchStart = (event: MapTouchEvent) => {
      if (event.points.length !== 1) {
        return;
      }
      begin(event.lngLat.lat, event.lngLat.lng);
    };
    const onTouchMove = (event: MapTouchEvent) => {
      extend(event.lngLat.lat, event.lngLat.lng);
    };

    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", end);
    map.on("mouseout", end);
    map.on("touchstart", onTouchStart);
    map.on("touchmove", onTouchMove);
    map.on("touchend", end);
    map.on("touchcancel", end);

    return () => {
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onMouseMove);
      map.off("mouseup", end);
      map.off("mouseout", end);
      map.off("touchstart", onTouchStart);
      map.off("touchmove", onTouchMove);
      map.off("touchend", end);
      map.off("touchcancel", end);
      if (drawingRef.current) {
        drawingRef.current = false;
        map.dragPan.enable();
      }
    };
  }, [enabled, map]);

  return null;
}
