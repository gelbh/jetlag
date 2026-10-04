import type { MapBoundsExpression } from "../../domain/map/mapBounds";
import type { GeocodedPlace } from "../../services/geo/geocoding";

const GPS_FOCUS_PAD_DEG = 0.018;
/** Tiny Nominatim bboxes fail cameraForBounds once strip padding is applied. */
const PLACE_FOCUS_MIN_SPAN_DEG = 0.04;

function expandFocusBox(box: { south: number; west: number; north: number; east: number }): {
  south: number;
  west: number;
  north: number;
  east: number;
} {
  let { south, west, north, east } = box;
  const latSpan = north - south;
  const lngSpan = east - west;

  if (latSpan < PLACE_FOCUS_MIN_SPAN_DEG) {
    const centerLat = (north + south) / 2;
    south = Math.max(-90, centerLat - PLACE_FOCUS_MIN_SPAN_DEG / 2);
    north = Math.min(90, centerLat + PLACE_FOCUS_MIN_SPAN_DEG / 2);
  }

  if (lngSpan < PLACE_FOCUS_MIN_SPAN_DEG) {
    const centerLng = (east + west) / 2;
    west = Math.max(-180, centerLng - PLACE_FOCUS_MIN_SPAN_DEG / 2);
    east = Math.min(180, centerLng + PLACE_FOCUS_MIN_SPAN_DEG / 2);
  }

  return { south, west, north, east };
}

export function placeToFocusBounds(place: GeocodedPlace): MapBoundsExpression {
  const { south, west, north, east } = expandFocusBox(place.bounds);
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
