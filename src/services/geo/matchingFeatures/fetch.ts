import type { GameArea } from "../../../domain/map/annotations";
import type { LatLngTuple } from "../../../domain/geometry/geometry";
import type { MatchingFeature } from "../../../domain/geo/types";
import {
  adminLevelForMatchingCategory,
  getMatchingCategory,
  type MatchingCategoryId,
} from "../../../domain/questions";
import {
  matchingOverpassSelectorsForCategory,
  resolveMatchingCategory,
} from "../../../domain/session/sessionCustomCatalog";
import type { CustomMatchingAreasByLevel } from "../../../domain/session/sessionCustomContent";
import type { SessionCustomCategory } from "../../../domain/session/sessionCustomContent";
import {
  adminDivisionToMatchingFeature,
  matchingFeaturesToAdminDivisions,
  matchingFeaturesToBoundedRegions,
  pickNearestMatchingFeature,
} from "../../../domain/geo/matchingAdapters";
import {
  classifyAdminDivisionAtPoint,
  fetchAdminDivisionFeaturesInArea,
} from "../adminDivisionBoundaries";
import {
  classifyLandmassAtPoint,
  fetchLandmassFeaturesInArea,
  landmassToMatchingFeature,
} from "../landmassFeatures";
import { queryOverpass } from "../../core/overpassClient";
import { getOrFetchCached } from "../geographicFeatureCache";
import {
  buildMatchingFeaturesQuery,
  matchingFeaturesCacheKey,
} from "./query";
import { parseMatchingFeatures } from "./parse";
import {
  buildLetterZoneFeatures,
  buildStationFirstLetterFeatures,
  buildStationNameLengthFeatures,
  letterZoneFeatureIdForDivision,
} from "./specialized";
import {
  fetchStationFeaturesInArea,
  fetchStreetPathFeaturesInArea,
  fetchTransitLineMatchingFeaturesInArea,
} from "./transit";
import type { MatchingFetchOptions, OverpassElement } from "./types";

async function fetchOverpassMatchingFeaturesInArea(
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
  customCategories: readonly SessionCustomCategory[] = [],
): Promise<MatchingFeature[]> {
  const selectors = matchingOverpassSelectorsForCategory(
    categoryId,
    customCategories,
  );
  if (selectors.length === 0) {
    return [];
  }

  const payload = await queryOverpass<{ elements: OverpassElement[] }>(
    buildMatchingFeaturesQuery(gameArea, categoryId, selectors, customCategories),
  );

  return parseMatchingFeatures(
    payload.elements,
    gameArea,
    categoryId,
    customCategories,
  );
}

async function fetchAdminMatchingFeaturesInArea(
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
  customMatchingAreas?: CustomMatchingAreasByLevel,
): Promise<MatchingFeature[]> {
  const adminLevel = adminLevelForMatchingCategory(categoryId);
  if (adminLevel === null) {
    return [];
  }

  const customJson =
    customMatchingAreas?.[adminLevel as keyof CustomMatchingAreasByLevel];

  const divisions = await fetchAdminDivisionFeaturesInArea(
    gameArea,
    adminLevel,
    customJson,
  );
  return divisions.map(adminDivisionToMatchingFeature);
}

async function fetchLandmassMatchingFeaturesInArea(
  gameArea: GameArea,
): Promise<MatchingFeature[]> {
  const landmasses = await fetchLandmassFeaturesInArea(gameArea);
  return landmasses.map(landmassToMatchingFeature);
}

export async function fetchMatchingFeaturesInArea(
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
  options?: MatchingFetchOptions,
): Promise<MatchingFeature[]> {
  const customCategories = options?.customCategories ?? [];

  return getOrFetchCached(
    matchingFeaturesCacheKey(gameArea, categoryId, options),
    async () => {
      const category =
        resolveMatchingCategory(categoryId, customCategories) ??
        getMatchingCategory(categoryId);

      switch (category.resolver) {
        case "overpassPoint":
          return fetchOverpassMatchingFeaturesInArea(
            gameArea,
            categoryId,
            customCategories,
          );
        case "streetPath":
          return fetchStreetPathFeaturesInArea(gameArea);
        case "stationNameLength":
          return buildStationNameLengthFeatures(
            await fetchStationFeaturesInArea(gameArea),
          );
        case "stationFirstLetter":
          return buildStationFirstLetterFeatures(
            await fetchStationFeaturesInArea(gameArea),
          );
        case "letterZone": {
          const divisions = await fetchAdminDivisionFeaturesInArea(
            gameArea,
            4,
            options?.customMatchingAreas?.[4],
          );
          return buildLetterZoneFeatures(divisions);
        }
        case "reverseGeocodeAdmin":
          return fetchAdminMatchingFeaturesInArea(
            gameArea,
            categoryId,
            options?.customMatchingAreas,
          );
        case "landmass":
          return fetchLandmassMatchingFeaturesInArea(gameArea);
        case "transitLine":
          return fetchTransitLineMatchingFeaturesInArea(gameArea);
        default: {
          const _exhaustive: never = category.resolver;
          return _exhaustive;
        }
      }
    },
    { persistEmpty: false },
  );
}

export function pickMatchingFeatureForAnchor(
  anchor: LatLngTuple,
  features: MatchingFeature[],
  categoryId: MatchingCategoryId,
): (MatchingFeature & { distanceMeters: number }) | null {
  const category = getMatchingCategory(categoryId);

  if (category.resolver === "reverseGeocodeAdmin") {
    const divisions = matchingFeaturesToAdminDivisions(features);
    if (!divisions) {
      return null;
    }

    const division = classifyAdminDivisionAtPoint(anchor, divisions);
    if (!division) {
      return null;
    }

    return {
      ...adminDivisionToMatchingFeature(division),
      distanceMeters: 0,
    };
  }

  if (category.resolver === "landmass") {
    const landmasses = matchingFeaturesToBoundedRegions(features);
    if (!landmasses) {
      return null;
    }

    const landmass = classifyLandmassAtPoint(anchor, landmasses);
    if (!landmass) {
      return null;
    }

    return {
      ...landmassToMatchingFeature(landmass),
      distanceMeters: 0,
    };
  }

  return pickNearestMatchingFeature(anchor, features);
}

export async function findNearestMatchingFeature(
  anchor: LatLngTuple,
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
  options?: MatchingFetchOptions,
): Promise<(MatchingFeature & { distanceMeters: number }) | null> {
  const customCategories = options?.customCategories ?? [];
  const category =
    resolveMatchingCategory(categoryId, customCategories) ??
    getMatchingCategory(categoryId);

  if (category.resolver === "reverseGeocodeAdmin" || category.resolver === "letterZone") {
    const adminLevel =
      category.resolver === "letterZone"
        ? 4
        : adminLevelForMatchingCategory(categoryId);
    if (adminLevel === null) {
      return null;
    }

    const divisions = await fetchAdminDivisionFeaturesInArea(
      gameArea,
      adminLevel,
      options?.customMatchingAreas?.[adminLevel as keyof CustomMatchingAreasByLevel],
    );
    const division = classifyAdminDivisionAtPoint(anchor, divisions);
    if (!division) {
      return null;
    }

    const feature =
      category.resolver === "letterZone"
        ? buildLetterZoneFeatures([division]).find(
            (item) => item.id === letterZoneFeatureIdForDivision(division.name),
          )
        : adminDivisionToMatchingFeature(division);
    if (!feature) {
      return null;
    }

    return {
      ...feature,
      distanceMeters: 0,
    };
  }

  if (category.resolver === "landmass") {
    const landmasses = await fetchLandmassFeaturesInArea(gameArea);
    const landmass = classifyLandmassAtPoint(anchor, landmasses);
    if (!landmass) {
      return null;
    }

    const feature = landmassToMatchingFeature(landmass);
    return {
      ...feature,
      distanceMeters: 0,
    };
  }

  const features = await fetchMatchingFeaturesInArea(
    gameArea,
    categoryId,
    options,
  );
  return pickNearestMatchingFeature(anchor, features);
}
