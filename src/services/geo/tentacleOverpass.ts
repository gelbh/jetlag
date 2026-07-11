import { distanceBetweenPoints, type LatLngTuple } from "../../domain/geometry/geometry";
import type { TentaclePoi } from "../../domain/map/annotations";
import type {
  SessionCustomCategory,
  SessionCustomLocationPin,
} from "../../domain/session/sessionCustomContent";
import {
  manualPinsWithinRadius,
  tentacleOverpassSelectorsForCategory,
} from "../../domain/session/sessionCustomCatalog";
import {
  tentacleCategoryOverpassSelectors,
  type TentacleExtendedCategoryId,
} from "../../domain/questions/tentacleQuestions";
import { queryOverpass } from "../core/overpassClient";
import {
  fetchBundledTentaclePois,
  mergeTentaclePois,
} from "./regionPackPoi";
import type { RegionPackId } from "../../domain/regions/regionPack";
import {
  getOrFetchCached,
  tentaclePoisCacheKey,
} from "./geographicFeatureCache";

type OverpassElement = {
  id: number;
  type?: string;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
};

function selectorToFilter(selector: string): string {
  return selector.replace(/^\[/, "").replace(/\]$/, "");
}

export function buildTentacleOverpassQuery(
  center: LatLngTuple,
  radiusMeters: number,
  categoryId: TentacleExtendedCategoryId,
  customCategories: readonly SessionCustomCategory[] = [],
): string {
  if (categoryId === "metro_line") {
    return `
      [out:json][timeout:25];
      (
        relation(around:${radiusMeters},${center[0]},${center[1]})["route"~"subway|light_rail|tram|monorail"]["name"];
      );
      out center 40;
    `;
  }

  const clauses = tentacleOverpassSelectorsForCategory(
    categoryId,
    customCategories,
  ).flatMap(
    (selector) => {
      const filter = selectorToFilter(selector);

      return [
        `node(around:${radiusMeters},${center[0]},${center[1]})[${filter}];`,
        `way(around:${radiusMeters},${center[0]},${center[1]})[${filter}];`,
      ];
    },
  );

  return `
    [out:json][timeout:25];
    (
      ${clauses.join("\n      ")}
    );
    out center 40;
  `;
}

function isActiveTentaclePoi(
  tags: Record<string, string> | undefined,
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

  return true;
}

function matchesSelector(
  tags: Record<string, string>,
  selector: string,
): boolean {
  const filter = selectorToFilter(selector);
  const [key, value] = filter.split("=");
  if (!key || value === undefined) {
    return false;
  }

  return tags[key] === value;
}

export function tentacleCategoryForTags(
  tags: Record<string, string>,
  categoryId: TentacleExtendedCategoryId,
): TentacleExtendedCategoryId | null {
  if (categoryId === "metro_line") {
    const route = tags.route;
    if (
      route === "subway" ||
      route === "light_rail" ||
      route === "tram" ||
      route === "monorail"
    ) {
      return "metro_line";
    }
    return null;
  }

  const selectors = tentacleCategoryOverpassSelectors(categoryId);
  if (selectors.some((selector) => matchesSelector(tags, selector))) {
    return categoryId;
  }

  return null;
}

export function parseTentaclePois(
  elements: OverpassElement[],
  categoryId: TentacleExtendedCategoryId,
): TentaclePoi[] {
  const seen = new Set<string>();

  return elements
    .map((element) => {
      if (!isActiveTentaclePoi(element.tags)) {
        return null;
      }

      const category = tentacleCategoryForTags(element.tags!, categoryId);
      if (!category) {
        return null;
      }

      const lat = element.lat ?? element.center?.lat;
      const lng = element.lon ?? element.center?.lon;

      if (lat === undefined || lng === undefined) {
        return null;
      }

      const id = String(element.id);
      if (seen.has(id)) {
        return null;
      }

      seen.add(id);

      const displayName =
        element.tags!.ref?.trim() && categoryId === "metro_line"
          ? `${element.tags!.name!.trim()} (${element.tags!.ref!.trim()})`
          : element.tags!.name!.trim();

      return {
        id,
        name: displayName,
        lat,
        lng,
        category,
      } satisfies TentaclePoi;
    })
    .filter((poi) => poi !== null) as TentaclePoi[];
}

export interface TentacleNearestPoi {
  poiId: string;
  distanceMeters: number;
}

export function nearestTentaclePoi(
  point: LatLngTuple,
  pois: TentaclePoi[],
): TentacleNearestPoi | null {
  let nearest: TentacleNearestPoi | null = null;

  for (const poi of pois) {
    const distanceMeters = distanceBetweenPoints(point, [poi.lat, poi.lng]);
    if (
      !nearest ||
      distanceMeters < nearest.distanceMeters ||
      (distanceMeters === nearest.distanceMeters &&
        poi.id.localeCompare(nearest.poiId) < 0)
    ) {
      nearest = { poiId: poi.id, distanceMeters };
    }
  }

  return nearest;
}

export async function fetchTentaclePois(
  center: LatLngTuple,
  radiusMeters: number,
  categoryId: TentacleExtendedCategoryId,
  options?: {
    customCategories?: readonly SessionCustomCategory[];
    customLocationPins?: readonly SessionCustomLocationPin[];
    regionPackId?: RegionPackId;
  },
): Promise<TentaclePoi[]> {
  const customCategories = options?.customCategories ?? [];
  const cacheScope = options?.regionPackId
    ? `${categoryId}:${options.regionPackId}`
    : categoryId;
  const overpassPois = await getOrFetchCached(
    tentaclePoisCacheKey(center, radiusMeters, cacheScope),
    async () => {
      const payload = await queryOverpass<{ elements: OverpassElement[] }>(
        buildTentacleOverpassQuery(
          center,
          radiusMeters,
          categoryId,
          customCategories,
        ),
      );

      return parseTentaclePois(payload.elements, categoryId);
    },
  );

  const pinPois = manualPinsWithinRadius(
    options?.customLocationPins ?? [],
    center,
    radiusMeters,
    categoryId,
  );

  const bundledPois = await fetchBundledTentaclePois(
    center,
    radiusMeters,
    categoryId,
    options?.regionPackId,
  );

  const mergedOverpass = mergeTentaclePois(overpassPois, bundledPois);
  const seen = new Set(mergedOverpass.map((poi) => poi.id));
  return [...mergedOverpass, ...pinPois.filter((poi) => !seen.has(poi.id))];
}
