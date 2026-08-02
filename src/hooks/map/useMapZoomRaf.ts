import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

/**
 * Coalesce Leaflet `zoom` to one rAF callback; run `onSettle` immediately on
 * `zoomend` (and cancel a pending frame).
 */
export function useMapZoomRaf(
  map: LeafletMap,
  onFrame: () => void,
  onSettle: () => void = onFrame,
): void {
  const onFrameRef = useRef(onFrame);
  const onSettleRef = useRef(onSettle);
  const rafRef = useRef(0);

  useEffect(() => {
    onFrameRef.current = onFrame;
    onSettleRef.current = onSettle;
  }, [onFrame, onSettle]);

  useEffect(() => {
    const schedule = () => {
      if (rafRef.current !== 0) {
        return;
      }
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        onFrameRef.current();
      });
    };

    const settle = () => {
      if (rafRef.current !== 0) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      onSettleRef.current();
    };

    map.on("zoom", schedule);
    map.on("zoomend", settle);

    return () => {
      map.off("zoom", schedule);
      map.off("zoomend", settle);
      if (rafRef.current !== 0) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [map]);
}
