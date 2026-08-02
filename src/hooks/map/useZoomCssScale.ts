import { useCallback, useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import { cssZoomScale } from "../../domain/map/zoomTransformCompensation";

/**
 * CSS scale Leaflet applies to the vector renderer since the last path
 * project (`viewreset` / `zoomend`). Mid-pinch `zoom` must not advance the
 * anchor — only settle events do.
 */
export function useZoomCssScale(): number {
  const map = useMap();
  const anchorZoomRef = useRef(map.getZoom());
  const [scale, setScale] = useState(1);
  const rafRef = useRef(0);

  const syncScale = useCallback(() => {
    const next = cssZoomScale(map.getZoom(), anchorZoomRef.current);
    setScale((prev) => (prev === next ? prev : next));
  }, [map]);

  const scheduleSync = useCallback(() => {
    if (rafRef.current !== 0) {
      return;
    }
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      syncScale();
    });
  }, [syncScale]);

  const settleAnchor = useCallback(() => {
    anchorZoomRef.current = map.getZoom();
    setScale(1);
  }, [map]);

  useEffect(() => {
    anchorZoomRef.current = map.getZoom();
    setScale(1);

    const onZoom = () => {
      scheduleSync();
    };
    const onSettle = () => {
      if (rafRef.current !== 0) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      settleAnchor();
    };

    map.on("zoom", onZoom);
    map.on("viewreset", onSettle);
    map.on("zoomend", onSettle);

    return () => {
      map.off("zoom", onZoom);
      map.off("viewreset", onSettle);
      map.off("zoomend", onSettle);
      if (rafRef.current !== 0) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [map, scheduleSync, settleAnchor]);

  return scale;
}
