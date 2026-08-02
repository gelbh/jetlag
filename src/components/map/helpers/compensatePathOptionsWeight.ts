import type { PathOptions } from "leaflet";
import { compensateZoomTransformWeight } from "../../../domain/map/zoomTransformCompensation";

/** Apply CSS-zoom compensation to stroke weight; leave other options intact. */
export function compensatePathOptionsWeight(
  pathOptions: PathOptions | undefined,
  cssScale: number,
): PathOptions | undefined {
  if (pathOptions == null) {
    return pathOptions;
  }
  const logicalWeight = pathOptions.weight;
  if (logicalWeight == null) {
    return pathOptions;
  }
  return {
    ...pathOptions,
    weight: compensateZoomTransformWeight(logicalWeight, cssScale),
  };
}
