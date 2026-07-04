import type { GameArea } from "../domain/annotations";
import {
  distanceBetweenPoints,
  isPointInGameArea,
  type LatLngTuple,
} from "../domain/geometry";
import {
  measuringLocationLabel,
  measuringLocationOverpassSelectors,
  type MeasuringLocationCategory,
} from "../domain/measuringQuestions";
import { queryOverpass } from "./overpassClient";
import {
  getOrFetchCached,
  measuringPlacesCacheKey,
} from "./geographicFeatureCache";
import {
  formatOverpassBboxFromGameArea,
  overpassQueryTemplate,
  overpassTaggedBboxClauses,
} from "./overpass/query";

export interface MeasuringPlace {
  id: string;
  name: string;
  point: LatLngTuple;
}

export const MEASURING_MAP_SNAP_RADIUS_METERS = 750;

type OverpassElement = {
  id: number;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
};

function buildMeasuringPlacesQuery(
  gameArea: GameArea,
  selectors: readonly string[],
): string {
  const bbox = formatOverpassBboxFromGameArea(gameArea);
  const clauses = overpassTaggedBboxClauses(bbox, selectors);

  return overpassQueryTemplate(`
  (
    ${clauses.join("\n    ")}
  );
  out center 200;
  `);
}

function isSwimmingPool(tags: Record<string, string>): boolean {
  return (
    tags.leisure === "swimming_pool" || tags.amenity === "swimming_pool"
  );
}

function isActiveMeasuringPlace(
  tags: Record<string, string> | undefined,
  category?: MeasuringLocationCategory,
): boolean {
  if (!tags) {
    return false;
  }

  const name = tags.name?.trim();
  if (!name) {
    return false;
  }

  if (tags.disused === "yes" || tags.abandoned === "yes") {
    return false;
  }

  if (category === "body_of_water" && isSwimmingPool(tags)) {
    return false;
  }

  return true;
}

export function parseMeasuringPlaces(
  elements: OverpassElement[],
  gameArea: GameArea,
  category?: MeasuringLocationCategory,
): MeasuringPlace[] {
  const seen = new Set<string>();

  return elements
    .map((element) => {
      if (!isActiveMeasuringPlace(element.tags, category)) {
        return null;
      }

      const lat = element.lat ?? element.center?.lat;
      const lng = element.lon ?? element.center?.lon;

      if (lat === undefined || lng === undefined) {
        return null;
      }

      const point: LatLngTuple = [lat, lng];
      if (!isPointInGameArea(point, gameArea)) {
        return null;
      }

      const id = String(element.id);
      if (seen.has(id)) {
        return null;
      }

      seen.add(id);

      return {
        id,
        name: element.tags?.name?.trim() ?? "",
        point,
      } satisfies MeasuringPlace;
    })
    .filter((place): place is MeasuringPlace => place !== null);
}

export async function fetchMeasuringPlacesInArea(
  gameArea: GameArea,
  category: MeasuringLocationCategory,
): Promise<MeasuringPlace[]> {
  const selectors = measuringLocationOverpassSelectors(category);
  if (selectors.length === 0) {
    return [];
  }

  return getOrFetchCached(
    measuringPlacesCacheKey(gameArea, category),
    async () => {
      const payload = await queryOverpass<{ elements: OverpassElement[] }>(
        buildMeasuringPlacesQuery(gameArea, selectors),
      );

      return parseMeasuringPlaces(payload.elements, gameArea, category);
    },
  );
}

export async function findNearestMeasuringPlace(
  seeker: LatLngTuple,
  gameArea: GameArea,
  category: MeasuringLocationCategory,
  options?: { maxDistanceMeters?: number },
): Promise<(MeasuringPlace & { distanceMeters: number }) | null> {
  const places = await fetchMeasuringPlacesInArea(gameArea, category);
  let nearest: (MeasuringPlace & { distanceMeters: number }) | null = null;

  for (const place of places) {
    const distanceMeters = distanceBetweenPoints(seeker, place.point);
    if (
      options?.maxDistanceMeters !== undefined &&
      distanceMeters > options.maxDistanceMeters
    ) {
      continue;
    }

    if (!nearest || distanceMeters < nearest.distanceMeters) {
      nearest = { ...place, distanceMeters };
    }
  }

  return nearest;
}

export function measuringPlaceNotFoundMessage(
  category: MeasuringLocationCategory,
  nearMapTap = false,
): string {
  const label = measuringLocationLabel(category).toLowerCase();
  if (nearMapTap) {
    return `No named ${label} found near that map tap. Try Nearest or tap closer to the venue.`;
  }

  return `No named ${label} found in this play area.`;
}
