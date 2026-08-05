import type { GameArea } from "@/domain/map/annotations";
import {
  gameAreaToBoundingBox,
  type LatLngTuple,
} from "@/domain/geometry/gameArea/geometry";
import type { BoundingBox } from "@/domain/geometry/gameArea/gameAreaBounds";
import {
  adminLevelForMatchingCategory,
  type MatchingCategoryId,
} from "@/domain/questions";
import type { SessionCustomCategory } from "@/domain/session/catalog/sessionCustomContent";
import { customMatchingAreasCacheSuffix } from "./matchingAreaGeoJson";
import { geographicCacheKey } from "../cache";
import {
  buildNodeWayRelationBboxQuery,
  formatOverpassBbox,
  overpassQueryTemplate,
} from "../overpass/queryHelpers";
import type { MatchingFetchOptions } from "./types";

export function matchingFeaturesCacheKey(
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
  options?: MatchingFetchOptions,
): string {
  const adminLevel = adminLevelForMatchingCategory(categoryId);
  const customSuffix =
    adminLevel !== null
      ? customMatchingAreasCacheSuffix(
          options?.customMatchingAreas as Record<number, string> | undefined,
          adminLevel,
        )
      : "";
  return geographicCacheKey(
    gameArea,
    `matching:in:${categoryId}${customSuffix}`,
  );
}

export function matchingSearchBoundingBox(
  gameArea: GameArea,
  _categoryId?: MatchingCategoryId,
  _customCategories: readonly SessionCustomCategory[] = [],
): BoundingBox {
  return gameAreaToBoundingBox(gameArea);
}

export { formatOverpassBbox } from "../overpass/queryHelpers";

export function buildMatchingFeaturesQuery(
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
  selectors: readonly string[],
  customCategories: readonly SessionCustomCategory[] = [],
): string {
  const bbox = formatOverpassBbox(
    matchingSearchBoundingBox(gameArea, categoryId, customCategories),
  );

  return buildNodeWayRelationBboxQuery(bbox, selectors);
}

export function buildStreetPathQuery(gameArea: GameArea): string {
  const bbox = formatOverpassBbox(
    matchingSearchBoundingBox(gameArea, "street_or_path"),
  );

  return overpassQueryTemplate(`
  (
    way["highway"]["name"](${bbox});
    way["footway"]["name"](${bbox});
    way["path"]["name"](${bbox});
  );
  out center 200;
  `);
}

export type { LatLngTuple };
