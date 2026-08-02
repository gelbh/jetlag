import type { PathOptions } from "leaflet";
import { compensateZoomTransformWeight } from "../../../domain/map/zoomTransformCompensation";

/** Apply CSS-zoom compensation to stroke weight; leave other options intact. */
export function compensatePathOptionsWeight<T extends PathOptions | undefined>(
  pathOptions: T,
  cssScale: number,
): T {
  const logicalWeight = pathOptions?.weight;
  if (pathOptions == null && logicalWeight == null) {
    return pathOptions;
  }
  if (logicalWeight == null) {
    return pathOptions;
  }
  return {
    ...pathOptions,
    weight: compensateZoomTransformWeight(logicalWeight, cssScale),
  } as T;
}
