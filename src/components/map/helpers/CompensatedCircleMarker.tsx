import { CircleMarker, type CircleMarkerProps } from "react-leaflet";
import { compensateZoomTransformWeight } from "../../../domain/map/zoomTransformCompensation";
import { useZoomCssScale } from "../../../hooks/map/useZoomCssScale";

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
  const compensatedRadius = compensateZoomTransformWeight(radius, cssScale);
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

  return (
    <CircleMarker
      {...rest}
      radius={compensatedRadius}
      pathOptions={compensatedPathOptions}
    />
  );
}
