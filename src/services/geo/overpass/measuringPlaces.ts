import {
  distanceBetweenPoints,
  gameAreaToBoundingBox,
  isPointInGameArea,
  type LatLngTuple,
} from "@/domain/geometry/gameArea/geometry";
import type { GameArea } from "@/domain/map/annotations";
import type { LoadPriority } from "@/domain/progress/progressTree";
import { type MeasuringLocationCategory, measuringLocationLabel } from "@/domain/questions";
import type { RegionPackId } from "@/domain/regions/regionPack";
import { measuringOverpassSelectorsForKind } from "@/domain/session/catalog/sessionCustomCatalog";
import type { SessionCustomCategory } from "@/domain/session/catalog/sessionCustomContent";
import { getOrFetchCached, measuringPlacesCacheKey } from "../cache";
import { parseWikidataId } from "../parseWikidataId";
import { isEligibleBundledPoi } from "./bundledPoiHygiene";
import { mergeOverpassElementPayloads } from "./overpassBboxSplit";
import {
  cachedFetchOptions,
  enrichInBackground,
  type OverpassLoad,
  overpassLoadFromFetch,
  overpassLoadFromTask,
  overpassSearchStage,
  type PackThenOverpassProgress,
  queryOverpassSplitLoaded,
  withBundleStage,
} from "./overpassLoad";
import {
  buildTaggedBboxOverpassQuery,
  formatOverpassBbox,
  formatOverpassBboxFromGameArea,
} from "./queryHelpers";
import { fetchBundledMeasuringPlaces, mergeMeasuringPlaces } from "./regionPackPoi";

const HYGIENE_MEASURING_CATEGORIES = new Set<MeasuringLocationCategory>([
  "commercial_airport",
  "rail_station",
  "mountain",
  "park",
  "museum",
  "hospital",
]);

function filterHygieneMeasuringPlaces(
  places: MeasuringPlace[],
  category: MeasuringLocationCategory,
): MeasuringPlace[] {
  if (!HYGIENE_MEASURING_CATEGORIES.has(category)) {
    return places;
  }

  return places.filter((place) =>
    isEligibleBundledPoi(
      {
        id: place.id,
        name: place.name,
        lat: place.point[0],
        lng: place.point[1],
      },
      category,
    ),
  );
}

export interface MeasuringPlace {
  id: string;
  name: string;
  point: LatLngTuple;
  wikidataId?: string;
}

export const MEASURING_MAP_SNAP_RADIUS_METERS = 750;

type OverpassElement = {
  id: number;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
};

export type FetchMeasuringPlacesOptions = {
  onEnrich?: (places: MeasuringPlace[]) => void;
  /** Pool lane when no task drives the load, e.g. "background" for preload. */
  priority?: LoadPriority;
  /** Pack subregion (e.g. Australia `stateId`) for bandwidth-scoped POI slices. */
  subregionId?: string;
} & PackThenOverpassProgress;

export function buildMeasuringPlacesQuery(
  gameArea: GameArea,
  selectors: readonly string[],
): string {
  return buildTaggedBboxOverpassQuery(formatOverpassBboxFromGameArea(gameArea), selectors);
}

function buildMeasuringPlacesQueryForBbox(
  bbox: { south: number; west: number; north: number; east: number },
  selectors: readonly string[],
): string {
  return buildTaggedBboxOverpassQuery(formatOverpassBbox(bbox), selectors);
}

function isSwimmingPool(tags: Record<string, string>): boolean {
  return tags.leisure === "swimming_pool" || tags.amenity === "swimming_pool";
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

      const wikidataId = parseWikidataId(element.tags);

      return {
        id,
        name: element.tags?.name?.trim() ?? "",
        point,
        ...(wikidataId ? { wikidataId } : {}),
      } satisfies MeasuringPlace;
    })
    .filter((place): place is MeasuringPlace => place !== null);
}

const MEASURING_PLACES_HISTORY_KEY = "overpass:measuring-places";

async function fetchOverpassMeasuringPlaces(
  gameArea: GameArea,
  category: MeasuringLocationCategory,
  selectors: readonly string[],
  cacheScope: string,
  load?: OverpassLoad,
): Promise<MeasuringPlace[]> {
  const bbox = gameAreaToBoundingBox(gameArea);
  return getOrFetchCached(
    measuringPlacesCacheKey(gameArea, cacheScope),
    async (context) => {
      const payload = await queryOverpassSplitLoaded<{ elements: OverpassElement[] }>(
        (child) => buildMeasuringPlacesQueryForBbox(child, selectors),
        bbox,
        mergeOverpassElementPayloads,
        overpassLoadFromFetch(context),
      );

      return filterHygieneMeasuringPlaces(
        parseMeasuringPlaces(payload.elements, gameArea, category),
        category,
      );
    },
    cachedFetchOptions(load, overpassSearchStage(MEASURING_PLACES_HISTORY_KEY, bbox)),
  );
}

export async function fetchMeasuringPlacesInArea(
  gameArea: GameArea,
  category: MeasuringLocationCategory,
  customCategories: readonly SessionCustomCategory[] = [],
  regionPackId?: RegionPackId,
  options?: FetchMeasuringPlacesOptions,
): Promise<MeasuringPlace[]> {
  const selectors = measuringOverpassSelectorsForKind(category, customCategories);
  if (selectors.length === 0) {
    return [];
  }

  const cacheScope =
    customCategories.length > 0
      ? `${category}:custom:${regionPackId ?? "global"}`
      : `${category}:${regionPackId ?? "global"}`;

  const task = options?.task;
  const searchSpec = overpassSearchStage(
    MEASURING_PLACES_HISTORY_KEY,
    gameAreaToBoundingBox(gameArea),
  );
  const bundledPlaces = await withBundleStage(task, () =>
    fetchBundledMeasuringPlaces(gameArea, category, regionPackId, options?.subregionId),
  );

  const mergeWithOverpass = async (load?: OverpassLoad): Promise<MeasuringPlace[]> => {
    const overpassPlaces = await fetchOverpassMeasuringPlaces(
      gameArea,
      category,
      selectors,
      cacheScope,
      load,
    );
    return mergeMeasuringPlaces(overpassPlaces, bundledPlaces);
  };

  if (bundledPlaces.length > 0 && options?.onEnrich) {
    enrichInBackground(options.createEnrichTask, searchSpec, mergeWithOverpass, (merged) => {
      options.onEnrich?.(merged);
    });
    return bundledPlaces;
  }

  return mergeWithOverpass(
    task ? overpassLoadFromTask(task, searchSpec) : { priority: options?.priority },
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
    if (options?.maxDistanceMeters !== undefined && distanceMeters > options.maxDistanceMeters) {
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
