import { Polygon, type PolygonProps } from "react-leaflet";
import { useZoomCssScale } from "../../../hooks/map/useZoomCssScale";
import { compensatePathOptionsWeight } from "./compensatePathOptionsWeight";
import { MID_GESTURE_PATH_DEFAULTS } from "./midGesturePathDefaults";

/**
 * Polygon with mid-gesture noClip and stroke weight compensated for Leaflet
 * CSS zoom. Prefer for fill masks and stroked polygons on the live map.
 */
export function CompensatedPolygon({ pathOptions, ...rest }: PolygonProps) {
  const cssScale = useZoomCssScale();
  const withDefaults = {
    ...MID_GESTURE_PATH_DEFAULTS,
    ...pathOptions,
  };
  return (
    <Polygon
      {...rest}
      pathOptions={compensatePathOptionsWeight(withDefaults, cssScale)}
    />
  );
}
