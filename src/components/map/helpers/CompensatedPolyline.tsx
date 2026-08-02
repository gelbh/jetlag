import { Polyline, type PolylineProps } from "react-leaflet";
import { compensateZoomTransformWeight } from "../../../domain/map/zoomTransformCompensation";
import { useZoomCssScale } from "../../../hooks/map/useZoomCssScale";

/**
 * Polyline with stroke weight compensated for Leaflet's mid-gesture CSS zoom.
 */
export function CompensatedPolyline({ pathOptions, ...rest }: PolylineProps) {
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

  return <Polyline {...rest} pathOptions={compensatedPathOptions} />;
}
