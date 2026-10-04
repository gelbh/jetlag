import type { MapBoundsExpression } from "../../domain/map/mapBounds";
import type { GeocodedPlace } from "../../services/geo/geocoding";

const GPS_FOCUS_PAD_DEG = 0.018;

export function placeToFocusBounds(place: GeocodedPlace): MapBoundsExpression {
  const { south, west, north, east } = place.bounds;
  return [
    [south, west],
    [north, east],
  ];
}

export function gpsReadingToFocusBounds(lat: number, lng: number): MapBoundsExpression {
  const south = Math.max(-90, lat - GPS_FOCUS_PAD_DEG);
  const north = Math.min(90, lat + GPS_FOCUS_PAD_DEG);
  const west = Math.max(-180, lng - GPS_FOCUS_PAD_DEG);
  const east = Math.min(180, lng + GPS_FOCUS_PAD_DEG);
  return [
    [south, west],
    [north, east],
  ];
}
