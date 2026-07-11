import type { LatLngBoundsExpression } from "leaflet";
import type { GeocodedPlace } from "../../services/geo/geocoding";

export function placeToFocusBounds(place: GeocodedPlace): LatLngBoundsExpression {
  const { south, west, north, east } = place.bounds;
  return [
    [south, west],
    [north, east],
  ];
}
