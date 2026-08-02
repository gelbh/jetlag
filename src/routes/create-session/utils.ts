import type { MapBoundsExpression } from "../../domain/map/mapBounds";
import type { GeocodedPlace } from "../../services/geo/geocoding";

export function placeToFocusBounds(place: GeocodedPlace): MapBoundsExpression {
  const { south, west, north, east } = place.bounds;
  return [
    [south, west],
    [north, east],
  ];
}
