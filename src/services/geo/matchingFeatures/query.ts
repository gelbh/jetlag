import type { GameArea } from "../../../domain/map/annotations";
import {
  gameAreaToBoundingBox,
  type LatLngTuple,
} from "../../../domain/geometry/geometry";
import {
  expandBoundingBox,
  type BoundingBox,
} from "../../../domain/geometry/gameAreaBounds";
import {
  adminLevelForMatchingCategory,
  getMatchingCategory,
  matchingUsesExpandedFeatureSearch,
  type MatchingCategoryId,
} from "../../../domain/questions";
import { resolveMatchingCategory } from "../../../domain/session/sessionCustomCatalog";
import type { SessionCustomCategory } from "../../../domain/session/sessionCustomContent";
import { customMatchingAreasCacheSuffix } from "../matchingAreaGeoJson";
import { geographicCacheKey } from "../geographicFeatureCache";
import {
  buildNodeWayRelationBboxQuery,
  formatOverpassBbox,
  overpassQueryTemplate,
} from "../queryHelpers";
import { MATCHING_NEAR_FEATURE_SEARCH_BUFFER_METERS, type MatchingFetchOptions } from "./types";

export function matchingFeaturesCacheKey(
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
  options?: MatchingFetchOptions,
): string {
  const category =
    resolveMatchingCategory(categoryId, options?.customCategories ?? []) ??
    getMatchingCategory(categoryId);
  const scope = matchingUsesExpandedFeatureSearch(category) ? "near" : "in";
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
    `matching:${scope}:${categoryId}${customSuffix}`,
  );
}

export function matchingSearchBoundingBox(
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
  customCategories: readonly SessionCustomCategory[] = [],
): BoundingBox {
  const bbox = gameAreaToBoundingBox(gameArea);
  const category =
    resolveMatchingCategory(categoryId, customCategories) ??
    getMatchingCategory(categoryId);

  if (!matchingUsesExpandedFeatureSearch(category)) {
    return bbox;
  }

  return expandBoundingBox(bbox, MATCHING_NEAR_FEATURE_SEARCH_BUFFER_METERS);
}

export { formatOverpassBbox } from "../queryHelpers";

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
