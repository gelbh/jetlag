import type { LatLngTuple } from "../geometry/gameArea/geometry";
import type { MeasuringPlace } from "../geo/types";

type StoredMeasuringPlace = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

/**
 * Prefer places embedded in region input (legacy). Otherwise hydrate from
 * `measuringPlacesJson` (current SoT when all-places measuring is used).
 */
export function measuringPlacesFromMetadata(
  metadata: Record<string, unknown>,
  regionPlaces: MeasuringPlace[] | undefined,
): MeasuringPlace[] {
  if (regionPlaces && regionPlaces.length > 0) {
    return regionPlaces;
  }

  const placesJson = metadata.measuringPlacesJson;
  if (typeof placesJson !== "string") {
    return regionPlaces ?? [];
  }

  try {
    const parsed = JSON.parse(placesJson) as StoredMeasuringPlace[];
    if (!Array.isArray(parsed)) {
      return regionPlaces ?? [];
    }

    const places: MeasuringPlace[] = [];
    for (const entry of parsed) {
      if (
        typeof entry?.id !== "string" ||
        typeof entry?.name !== "string" ||
        typeof entry?.lat !== "number" ||
        typeof entry?.lng !== "number"
      ) {
        continue;
      }
      places.push({
        id: entry.id,
        name: entry.name,
        point: [entry.lat, entry.lng] as LatLngTuple,
      });
    }
    return places;
  } catch {
    return regionPlaces ?? [];
  }
}
