import type { GameArea } from "@/domain/map/annotations";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import { isPointInGameArea } from "@/domain/geometry/gameArea/geometry";
import type { MatchingFeature } from "@/domain/geo/types";
import {
  adminLevelForMatchingCategory,
  getMatchingCategory,
  type MatchingCategoryId,
  type MeasuringLocationCategory,
} from "@/domain/questions";
import {
  matchingOverpassSelectorsForCategory,
  resolveMatchingCategory,
} from "@/domain/session/catalog/sessionCustomCatalog";
import type { CustomMatchingAreasByLevel } from "@/domain/session/catalog/sessionCustomContent";
import type { SessionCustomCategory } from "@/domain/session/catalog/sessionCustomContent";
import type { RegionPackId } from "@/domain/regions/regionPack";
import {
  adminDivisionToMatchingFeature,
  matchingFeaturesToAdminDivisions,
  matchingFeaturesToBoundedRegions,
  pickNearestMatchingFeature,
} from "@/domain/geo/matchingAdapters";
import {
  classifyAdminDivisionAtPoint,
  fetchAdminDivisionFeaturesInArea,
} from "../overpass/adminDivisionBoundaries";
import {
  classifyLandmassAtPoint,
  fetchLandmassFeaturesInArea,
  landmassToMatchingFeature,
} from "../overpass/landmassFeatures";
import { queryOverpass } from "../../core/overpass/overpassClient";
import { getOrFetchCached } from "../cache";
import { isEligibleBundledPoi } from "../overpass/bundledPoiHygiene";
import type { MeasuringPlace } from "../overpass/measuringPlaces";
import {
  fetchBundledMeasuringPlaces,
  mergeMeasuringPlaces,
} from "../overpass/regionPackPoi";
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

const HYGIENE_MATCHING_CATEGORIES = new Set<MeasuringLocationCategory>([
  "commercial_airport",
  "rail_station",
  "mountain",
  "park",
  "museum",
  "hospital",
]);

const BUNDLED_MATCHING_CATEGORIES = new Set<MatchingCategoryId>([
  "commercial_airport",
  "mountain",
  "park",
  "museum",
  "hospital",
]);

function asBundledMeasuringCategory(
  categoryId: MatchingCategoryId,
): MeasuringLocationCategory | null {
  if (!BUNDLED_MATCHING_CATEGORIES.has(categoryId)) {
    return null;
  }
  return categoryId as MeasuringLocationCategory;
}

function measuringPlacesToMatchingFeatures(
  places: MeasuringPlace[],
  gameArea: GameArea,
): MatchingFeature[] {
  return places.map((place) => ({
    id: place.id,
    name: place.name,
    point: place.point,
    inPlayArea: isPointInGameArea(place.point, gameArea),
  }));
}

function matchingFeaturesToMeasuringPlaces(
  features: MatchingFeature[],
): MeasuringPlace[] {
  return features.map((feature) => ({
    id: feature.id,
    name: feature.name,
    point: feature.point,
  }));
}

function filterHygieneMatchingFeatures(
  features: MatchingFeature[],
  categoryId: MatchingCategoryId,
): MatchingFeature[] {
  const measuringCategory = asBundledMeasuringCategory(categoryId);
  if (
    measuringCategory === null ||
    !HYGIENE_MATCHING_CATEGORIES.has(measuringCategory)
  ) {
    return features;
  }

  return features.filter((feature) =>
    isEligibleBundledPoi(
      {
        id: feature.id,
        name: feature.name,
        lat: feature.point[0],
        lng: feature.point[1],
      },
      measuringCategory,
    ),
  );
}

async function fetchOverpassMatchingFeaturesCached(
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
  customCategories: readonly SessionCustomCategory[],
  options?: MatchingFetchOptions,
): Promise<MatchingFeature[]> {
  const selectors = matchingOverpassSelectorsForCategory(
    categoryId,
    customCategories,
  );
  if (selectors.length === 0) {
    return [];
  }

  return getOrFetchCached(
    matchingFeaturesCacheKey(gameArea, categoryId, options),
    async () => {
      const payload = await queryOverpass<{ elements: OverpassElement[] }>(
        buildMatchingFeaturesQuery(
          gameArea,
          categoryId,
          selectors,
          customCategories,
        ),
      );

      return parseMatchingFeatures(
        payload.elements,
        gameArea,
        categoryId,
        customCategories,
      );
    },
    { persistEmpty: false },
  );
}

async function fetchOverpassPointMatchingFeaturesInArea(
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
  customCategories: readonly SessionCustomCategory[],
  options?: MatchingFetchOptions,
): Promise<MatchingFeature[]> {
  const measuringCategory = asBundledMeasuringCategory(categoryId);
  const bundledPlaces =
    measuringCategory === null
      ? []
      : await fetchBundledMeasuringPlaces(
          gameArea,
          measuringCategory,
          options?.regionPackId,
        );
  const bundledFeatures = measuringPlacesToMatchingFeatures(
    bundledPlaces,
    gameArea,
  );

  const mergeWithOverpass = async (): Promise<MatchingFeature[]> => {
    const overpassFeatures = filterHygieneMatchingFeatures(
      await fetchOverpassMatchingFeaturesCached(
        gameArea,
        categoryId,
        customCategories,
        options,
      ),
      categoryId,
    );

    if (bundledFeatures.length === 0) {
      return overpassFeatures;
    }

    return measuringPlacesToMatchingFeatures(
      mergeMeasuringPlaces(
        matchingFeaturesToMeasuringPlaces(overpassFeatures),
        bundledPlaces,
      ),
      gameArea,
    );
  };

  if (bundledFeatures.length > 0 && options?.onEnrich) {
    void mergeWithOverpass()
      .then((merged) => {
        options.onEnrich?.(merged);
      })
      .catch(() => {
        // Soft-fail Overpass enrich; keep the bundle result.
      });
    return bundledFeatures;
  }

  return mergeWithOverpass();
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
  regionPackId?: RegionPackId,
): Promise<MatchingFeature[]> {
  const landmasses = await fetchLandmassFeaturesInArea(gameArea, regionPackId);
  return landmasses.map(landmassToMatchingFeature);
}

export async function fetchMatchingFeaturesInArea(
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
  options?: MatchingFetchOptions,
): Promise<MatchingFeature[]> {
  const customCategories = options?.customCategories ?? [];
  const category =
    resolveMatchingCategory(categoryId, customCategories) ??
    getMatchingCategory(categoryId);

  const resolver = category.resolver;
  if (resolver === "overpassPoint") {
    return fetchOverpassPointMatchingFeaturesInArea(
      gameArea,
      categoryId,
      customCategories,
      options,
    );
  }

  return getOrFetchCached(
    matchingFeaturesCacheKey(gameArea, categoryId, options),
    async () => {
      switch (resolver) {
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
          return fetchLandmassMatchingFeaturesInArea(
            gameArea,
            options?.regionPackId,
          );
        case "transitLine":
          return fetchTransitLineMatchingFeaturesInArea(gameArea);
        default: {
          const _exhaustive: never = resolver;
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
    const landmasses = await fetchLandmassFeaturesInArea(
      gameArea,
      options?.regionPackId,
    );
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
