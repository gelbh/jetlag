import type { LngLatBoundsLike } from "maplibre-gl";
import { type MapBounds, type MapBoundsExpression, normalizeBoundsExpression } from "./mapBounds";

/** Map focus bounds → MapLibre `[[west,south],[east,north]]`. */
export function focusBoundsToLngLatBounds(
  bounds: MapBoundsExpression | MapBounds,
): LngLatBoundsLike {
  const viewport = normalizeBoundsExpression(bounds);
  return [
    [viewport.west, viewport.south],
    [viewport.east, viewport.north],
  ];
}
