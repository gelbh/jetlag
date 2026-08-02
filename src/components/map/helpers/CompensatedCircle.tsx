import { Circle, type CircleProps } from "react-leaflet";
import { compensateZoomTransformWeight } from "../../../domain/map/zoomTransformCompensation";
import { useZoomCssScale } from "../../../hooks/map/useZoomCssScale";

/**
 * Geographic Circle (meter radius) with stroke weight compensated for
 * Leaflet's mid-gesture CSS zoom transform. Does not alter radius meters.
 */
export function CompensatedCircle({ pathOptions, ...rest }: CircleProps) {
  const cssScale = useZoomCssScale();
  const logicalWeight = pathOptions?.weight;
  const compensatedPathOptions =
    pathOptions == null && logicalWeight == null
      ? pathOptions
      : {
          ...pathOptions,
          ...(logicalWeight == null
            ? {}
            : {
                weight: compensateZoomTransformWeight(logicalWeight, cssScale),
              }),
        };

  return <Circle {...rest} pathOptions={compensatedPathOptions} />;
}
