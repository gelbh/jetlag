import { Polyline, type PolylineProps } from "react-leaflet";
import { useZoomCssScale } from "../../../hooks/map/useZoomCssScale";
import { compensatePathOptionsWeight } from "./compensatePathOptionsWeight";
import { MID_GESTURE_PATH_DEFAULTS } from "./midGesturePathDefaults";

/**
 * Polyline with stroke weight compensated for Leaflet's mid-gesture CSS zoom.
 */
export function CompensatedPolyline({ pathOptions, ...rest }: PolylineProps) {
  const cssScale = useZoomCssScale();
  const withDefaults = {
    ...MID_GESTURE_PATH_DEFAULTS,
    ...pathOptions,
  };
  return (
    <Polyline
      {...rest}
      pathOptions={compensatePathOptionsWeight(withDefaults, cssScale)}
    />
  );
}
