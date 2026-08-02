import { Circle, type CircleProps } from "react-leaflet";
import { useZoomCssScale } from "../../../hooks/map/useZoomCssScale";
import { compensatePathOptionsWeight } from "./compensatePathOptionsWeight";

/**
 * Geographic Circle (meter radius) with stroke weight compensated for
 * Leaflet's mid-gesture CSS zoom transform. Does not alter radius meters.
 */
export function CompensatedCircle({ pathOptions, ...rest }: CircleProps) {
  const cssScale = useZoomCssScale();
  return (
    <Circle
      {...rest}
      pathOptions={compensatePathOptionsWeight(pathOptions, cssScale)}
    />
  );
}
