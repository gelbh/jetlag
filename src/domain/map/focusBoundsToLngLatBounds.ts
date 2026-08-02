import {
  LatLngBounds,
  latLngBounds,
  type LatLngBoundsExpression,
} from "leaflet";
import type { LngLatBoundsLike } from "maplibre-gl";

/** Leaflet focus bounds → MapLibre `[[west,south],[east,north]]`. */
export function focusBoundsToLngLatBounds(
  bounds: LatLngBoundsExpression,
): LngLatBoundsLike {
  const leaflet =
    bounds instanceof LatLngBounds ? bounds : latLngBounds(bounds);
  return [
    [leaflet.getWest(), leaflet.getSouth()],
    [leaflet.getEast(), leaflet.getNorth()],
  ];
}
