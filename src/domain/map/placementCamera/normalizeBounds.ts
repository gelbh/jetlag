import {
  toMapBounds,
  type MapBounds,
  type MapBoundsExpression,
} from "../mapBounds";

/** @deprecated Prefer `toMapBounds`. Kept for placement-camera call sites mid-rename. */
export function toLeafletBounds(expression: MapBoundsExpression): MapBounds {
  return toMapBounds(expression);
}
