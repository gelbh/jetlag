import type { MeasuringPlace } from "@/domain/geo/types";
import { distanceBetweenPoints, type LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import type { AnnotationRecord } from "@/domain/map/annotations";
import { poiPinsForCategory } from "@/domain/map/poiPinCategories";
import {
  type MeasuringFromKind,
  type MeasuringLocationCategory,
  measuringMultiPlaceTargetLabel,
} from "@/domain/questions";
import {
  manualPinAsMeasuringPlace,
  setupPinsForCategory,
} from "@/domain/session/catalog/sessionCustomCatalog";
import type { SessionCustomLocationPin } from "@/domain/session/catalog/sessionCustomContent";

export function resolveAllPlacesTarget(input: {
  seekerPoint: LatLngTuple;
  fetched: MeasuringPlace[];
  customLocationPins: readonly SessionCustomLocationPin[];
  annotations: readonly AnnotationRecord[];
  category: MeasuringLocationCategory;
  kind: MeasuringFromKind;
}): {
  places: MeasuringPlace[];
  targetPoint: LatLngTuple;
  targetName: string;
  distanceMeters: number;
} | null {
  const { fetched, category } = input;
  const pinPlaces = [
    ...setupPinsForCategory(input.customLocationPins, category).map(manualPinAsMeasuringPlace),
    ...poiPinsForCategory(input.annotations, category),
  ];
  const seen = new Set(fetched.map((place) => place.id));
  const places = [...fetched, ...pinPlaces.filter((place) => !seen.has(place.id))];

  if (places.length === 0) {
    return null;
  }

  let nearestDistance = Infinity;
  let nearestPlace = places[0];

  for (const place of places) {
    const distanceMeters = distanceBetweenPoints(input.seekerPoint, place.point);
    if (distanceMeters < nearestDistance) {
      nearestDistance = distanceMeters;
      nearestPlace = place;
    }
  }

  return {
    places,
    targetPoint: nearestPlace.point,
    targetName: measuringMultiPlaceTargetLabel(places.length, input.kind),
    distanceMeters: nearestDistance,
  };
}
