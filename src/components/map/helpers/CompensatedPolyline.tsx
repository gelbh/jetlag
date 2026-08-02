import { Polyline, type PolylineProps } from "react-leaflet";
import { useZoomCssScale } from "../../../hooks/map/useZoomCssScale";
import { compensatePathOptionsWeight } from "./compensatePathOptionsWeight";

/**
 * Polyline with stroke weight compensated for Leaflet's mid-gesture CSS zoom.
 */
export function CompensatedPolyline({ pathOptions, ...rest }: PolylineProps) {
  const cssScale = useZoomCssScale();
  return (
    <Polyline
      {...rest}
      pathOptions={compensatePathOptionsWeight(pathOptions, cssScale)}
    />
  );
}
