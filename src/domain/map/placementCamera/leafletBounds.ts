import type { LatLngBoundsExpression } from "leaflet";
import { latLngBounds, type LatLngBounds } from "leaflet";

export function toLeafletBounds(
  expression: LatLngBoundsExpression,
): LatLngBounds {
  if (
    typeof expression === "object" &&
    expression !== null &&
    "getSouthWest" in expression
  ) {
    return expression;
  }

  return latLngBounds(expression as [[number, number], [number, number]]);
}
