import { expandBoundingBox } from "@/domain/geometry/gameArea/gameAreaBounds";
import { distanceBetweenPoints, type LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import type { TentaclePoi } from "@/domain/map/annotations";
import {
  type TentacleExtendedCategoryId,
  tentacleCategoryOverpassSelectors,
} from "@/domain/questions";
import type { RegionPackId } from "@/domain/regions/regionPack";
import {
  manualPinsWithinRadius,
  tentacleOverpassSelectorsForCategory,
} from "@/domain/session/catalog/sessionCustomCatalog";
import type {
  SessionCustomCategory,
  SessionCustomLocationPin,
} from "@/domain/session/catalog/sessionCustomContent";
import { queryOverpass } from "../../core/overpass/overpassClient";
import { getOrFetchCached, tentaclePoisCacheKey } from "../cache";
import { isEligibleBundledPoi } from "./bundledPoiHygiene";
import {
  mergeOverpassElementPayloads,
  type OverpassBbox,
  queryOverpassWithBboxSplit,
} from "./overpassBboxSplit";
import { formatOverpassBbox, overpassQueryTemplate } from "./query";
import { fetchBundledTentaclePois, mergeTentaclePois } from "./regionPackPoi";

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

export function tentacleSearchBoundingBox(center: LatLngTuple, radiusMeters: number): OverpassBbox {
  return expandBoundingBox(
    { south: center[0], north: center[0], west: center[1], east: center[1] },
    radiusMeters,
  );
}

export function buildTentacleOverpassQueryForBbox(
  bbox: OverpassBbox,
  categoryId: TentacleExtendedCategoryId,
  customCategories: readonly SessionCustomCategory[] = [],
): string {
  const bboxStr = formatOverpassBbox(bbox);

  if (categoryId === "metro_line") {
    return overpassQueryTemplate(`
      (
        relation["route"~"subway|light_rail|tram|monorail"]["name"](${bboxStr});
      );
      out center 40;
    `);
  }

  const selectors = tentacleOverpassSelectorsForCategory(categoryId, customCategories);
  const clauses = selectors.flatMap((selector) => [
    `node${selector}(${bboxStr});`,
    `way${selector}(${bboxStr});`,
  ]);

  return overpassQueryTemplate(`
    (
      ${clauses.join("\n      ")}
    );
    out center 40;
  `);
}

export function buildTentacleOverpassQuery(
  center: LatLngTuple,
  radiusMeters: number,
  categoryId: TentacleExtendedCategoryId,
  customCategories: readonly SessionCustomCategory[] = [],
): string {
  return buildTentacleOverpassQueryForBbox(
    tentacleSearchBoundingBox(center, radiusMeters),
    categoryId,
    customCategories,
  );
}

function filterTentaclePoisByRadius(
  pois: TentaclePoi[],
  center: LatLngTuple,
  radiusMeters: number,
): TentaclePoi[] {
  return pois.filter((poi) => distanceBetweenPoints(center, [poi.lat, poi.lng]) <= radiusMeters);
}

function isActiveTentaclePoi(tags: Record<string, string> | undefined): boolean {
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

function matchesSelector(tags: Record<string, string>, selector: string): boolean {
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
    if (route === "subway" || route === "light_rail" || route === "tram" || route === "monorail") {
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
      (distanceMeters === nearest.distanceMeters && poi.id.localeCompare(nearest.poiId) < 0)
    ) {
      nearest = { poiId: poi.id, distanceMeters };
    }
  }

  return nearest;
}

export type FetchTentaclePoisOptions = {
  customCategories?: readonly SessionCustomCategory[];
  customLocationPins?: readonly SessionCustomLocationPin[];
  regionPackId?: RegionPackId;
  onEnrich?: (pois: TentaclePoi[]) => void;
};

function withManualPins(mergedOverpass: TentaclePoi[], pinPois: TentaclePoi[]): TentaclePoi[] {
  const seen = new Set(mergedOverpass.map((poi) => poi.id));
  return [...mergedOverpass, ...pinPois.filter((poi) => !seen.has(poi.id))];
}

async function fetchOverpassTentaclePois(
  center: LatLngTuple,
  radiusMeters: number,
  categoryId: TentacleExtendedCategoryId,
  customCategories: readonly SessionCustomCategory[],
  cacheScope: string,
): Promise<TentaclePoi[]> {
  return getOrFetchCached(tentaclePoisCacheKey(center, radiusMeters, cacheScope), async () => {
    const payload = await queryOverpassWithBboxSplit(
      (bbox) => buildTentacleOverpassQueryForBbox(bbox, categoryId, customCategories),
      tentacleSearchBoundingBox(center, radiusMeters),
      (ql) => queryOverpass<{ elements: OverpassElement[] }>(ql),
      mergeOverpassElementPayloads,
    );

    return filterTentaclePoisByRadius(
      parseTentaclePois(payload.elements, categoryId),
      center,
      radiusMeters,
    );
  });
}

export async function fetchTentaclePois(
  center: LatLngTuple,
  radiusMeters: number,
  categoryId: TentacleExtendedCategoryId,
  options?: FetchTentaclePoisOptions,
): Promise<TentaclePoi[]> {
  const customCategories = options?.customCategories ?? [];
  const cacheScope = options?.regionPackId ? `${categoryId}:${options.regionPackId}` : categoryId;

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

  const mergeWithOverpass = async (): Promise<TentaclePoi[]> => {
    const overpassPois = await fetchOverpassTentaclePois(
      center,
      radiusMeters,
      categoryId,
      customCategories,
      cacheScope,
    );

    const mergedOverpass = mergeTentaclePois(
      overpassPois.filter((poi) =>
        isEligibleBundledPoi(
          { id: poi.id, name: poi.name, lat: poi.lat, lng: poi.lng },
          categoryId,
        ),
      ),
      bundledPois,
    );
    return withManualPins(mergedOverpass, pinPois);
  };

  if (bundledPois.length > 0 && options?.onEnrich) {
    void mergeWithOverpass()
      .then((merged) => {
        options.onEnrich?.(merged);
      })
      .catch(() => {});
    return withManualPins(bundledPois, pinPois);
  }

  return mergeWithOverpass();
}
