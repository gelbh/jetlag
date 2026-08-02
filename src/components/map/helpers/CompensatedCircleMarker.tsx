import { CircleMarker, type CircleMarkerProps } from "react-leaflet";
import { compensateZoomTransformWeight } from "../../../domain/map/zoomTransformCompensation";
import { useZoomCssScale } from "../../../hooks/map/useZoomCssScale";
import { compensatePathOptionsWeight } from "./compensatePathOptionsWeight";

/**
 * CircleMarker whose pixel radius and stroke weight undo Leaflet's mid-gesture
 * CSS zoom transform so markers do not inflate until zoomend.
 */
export function CompensatedCircleMarker({
  radius = 10,
  pathOptions,
  ...rest
}: CircleMarkerProps) {
  const cssScale = useZoomCssScale();
  return (
    <CircleMarker
      {...rest}
      radius={compensateZoomTransformWeight(radius, cssScale)}
      pathOptions={compensatePathOptionsWeight(pathOptions, cssScale)}
    />
  );
}
