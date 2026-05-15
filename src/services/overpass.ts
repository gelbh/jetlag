import { distanceBetweenPoints, type LatLngTuple } from "../domain/geometry";
import type { TentaclePoi } from "../domain/annotations";
import {
  tentacleCategoryOverpassSelectors,
  type TentacleLocationCategoryId,
} from "../domain/tentacleQuestions";
import { queryOverpass } from "./overpassClient";

type OverpassElement = {
  id: number;
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
  categoryId: TentacleLocationCategoryId,
): string {
  const clauses = tentacleCategoryOverpassSelectors(categoryId).flatMap(
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
  categoryId: TentacleLocationCategoryId,
): TentacleLocationCategoryId | null {
  const selectors = tentacleCategoryOverpassSelectors(categoryId);
  if (selectors.some((selector) => matchesSelector(tags, selector))) {
    return categoryId;
  }

  return null;
}

export function parseTentaclePois(
  elements: OverpassElement[],
  categoryId: TentacleLocationCategoryId,
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

      return {
        id,
        name: element.tags!.name!.trim(),
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
  categoryId: TentacleLocationCategoryId,
): Promise<TentaclePoi[]> {
  const payload = await queryOverpass<{ elements: OverpassElement[] }>(
    buildTentacleOverpassQuery(center, radiusMeters, categoryId),
  );

  return parseTentaclePois(payload.elements, categoryId);
}
