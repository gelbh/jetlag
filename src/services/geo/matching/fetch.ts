import {
  adminDivisionToMatchingFeature,
  matchingFeaturesToAdminDivisions,
  matchingFeaturesToBoundedRegions,
  pickNearestMatchingFeature,
} from "@/domain/geo/matchingAdapters";
import type { MatchingFeature } from "@/domain/geo/types";
import {
  gameAreaToBoundingBox,
  isPointInGameArea,
  type LatLngTuple,
} from "@/domain/geometry/gameArea/geometry";
import type { GameArea } from "@/domain/map/annotations";
import type { StageSpec } from "@/domain/progress/progressTree";
import {
  adminLevelForMatchingCategory,
  getMatchingCategory,
  type MatchingCategoryId,
  type MeasuringLocationCategory,
} from "@/domain/questions";
import { isPackGeoPointCategory } from "@/domain/regions/packGeoManifest";
import type { RegionPackId } from "@/domain/regions/regionPack";
import {
  matchingOverpassSelectorsForCategory,
  resolveMatchingCategory,
} from "@/domain/session/catalog/sessionCustomCatalog";
import type {
  CustomMatchingAreasByLevel,
  SessionCustomCategory,
} from "@/domain/session/catalog/sessionCustomContent";
import { getOrFetchCached } from "../cache";
import {
  classifyAdminDivisionAtPoint,
  fetchAdminDivisionFeaturesInArea,
} from "../overpass/adminDivisionBoundaries";
import { isEligibleBundledPoi } from "../overpass/bundledPoiHygiene";
import {
  classifyLandmassAtPoint,
  fetchLandmassFeaturesInArea,
  landmassToMatchingFeature,
} from "../overpass/landmassFeatures";
import type { MeasuringPlace } from "../overpass/measuringPlaces";
import { mergeOverpassElementPayloads } from "../overpass/overpassBboxSplit";
import {
  cachedFetchOptions,
  enrichInBackground,
  type OverpassLoad,
  overpassLoadFromFetch,
  overpassLoadFromTask,
  overpassSearchStage,
  queryOverpassSplitLoaded,
  withBundleStage,
} from "../overpass/overpassLoad";
import { fetchBundledMeasuringPlaces, mergeMeasuringPlaces } from "../overpass/regionPackPoi";
import { parseMatchingFeatures } from "./parse";
import { buildMatchingFeaturesQueryForBbox, matchingFeaturesCacheKey } from "./query";
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
  "mountain",
  "park",
  "museum",
  "hospital",
]);

function measuringPlacesToMatchingFeatures(
  places: MeasuringPlace[],
  gameArea: GameArea,
): MatchingFeature[] {
  return places.map((place) => ({
    id: place.id,
    name: place.name,
    point: place.point,
    inPlayArea: isPointInGameArea(place.point, gameArea),
    ...(place.wikidataId ? { wikidataId: place.wikidataId } : {}),
  }));
}

function matchingFeaturesToMeasuringPlaces(features: MatchingFeature[]): MeasuringPlace[] {
  return features.map((feature) => ({
    id: feature.id,
    name: feature.name,
    point: feature.point,
    ...(feature.wikidataId ? { wikidataId: feature.wikidataId } : {}),
  }));
}

function asPackMeasuringCategory(categoryId: MatchingCategoryId): MeasuringLocationCategory | null {
  if (!isPackGeoPointCategory(categoryId)) {
    return null;
  }
  return categoryId;
}

function filterHygieneMatchingFeatures(
  features: MatchingFeature[],
  categoryId: MatchingCategoryId,
): MatchingFeature[] {
  const measuringCategory = asPackMeasuringCategory(categoryId);
  if (measuringCategory === null || !HYGIENE_MATCHING_CATEGORIES.has(measuringCategory)) {
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

const MATCHING_POINT_HISTORY_KEY = "overpass:matching-point";

async function fetchOverpassMatchingFeaturesCached(
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
  customCategories: readonly SessionCustomCategory[],
  options?: MatchingFetchOptions,
  load?: OverpassLoad,
): Promise<MatchingFeature[]> {
  const selectors = matchingOverpassSelectorsForCategory(categoryId, customCategories);
  if (selectors.length === 0) {
    load?.node?.finish();
    return [];
  }

  const bbox = gameAreaToBoundingBox(gameArea);
  return getOrFetchCached(
    matchingFeaturesCacheKey(gameArea, categoryId, options),
    async (context) => {
      const payload = await queryOverpassSplitLoaded<{ elements: OverpassElement[] }>(
        (child) => buildMatchingFeaturesQueryForBbox(child, selectors),
        bbox,
        mergeOverpassElementPayloads,
        overpassLoadFromFetch(context),
      );

      return parseMatchingFeatures(payload.elements, gameArea, categoryId, customCategories);
    },
    cachedFetchOptions(load, overpassSearchStage(MATCHING_POINT_HISTORY_KEY, bbox), {
      persistEmpty: false,
    }),
  );
}

async function fetchOverpassPointMatchingFeaturesInArea(
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
  customCategories: readonly SessionCustomCategory[],
  options?: MatchingFetchOptions,
): Promise<MatchingFeature[]> {
  const task = options?.task;
  const measuringCategory = asPackMeasuringCategory(categoryId);
  const searchSpec = overpassSearchStage(
    MATCHING_POINT_HISTORY_KEY,
    gameAreaToBoundingBox(gameArea),
  );
  const bundledPlaces =
    measuringCategory === null
      ? []
      : await withBundleStage(task, () =>
          fetchBundledMeasuringPlaces(gameArea, measuringCategory, options?.regionPackId),
        );
  const bundledFeatures = measuringPlacesToMatchingFeatures(bundledPlaces, gameArea);
  const pinFeatures = measuringPlacesToMatchingFeatures([...(options?.poiPins ?? [])], gameArea);
  const withPins = (features: MatchingFeature[]): MatchingFeature[] => {
    const seen = new Set(features.map((feature) => feature.id));
    return [...features, ...pinFeatures.filter((feature) => !seen.has(feature.id))];
  };

  const mergeWithOverpass = async (load?: OverpassLoad): Promise<MatchingFeature[]> => {
    const overpassFeatures = filterHygieneMatchingFeatures(
      await fetchOverpassMatchingFeaturesCached(
        gameArea,
        categoryId,
        customCategories,
        options,
        load,
      ),
      categoryId,
    );

    if (bundledFeatures.length === 0) {
      return withPins(overpassFeatures);
    }

    return withPins(
      measuringPlacesToMatchingFeatures(
        mergeMeasuringPlaces(matchingFeaturesToMeasuringPlaces(overpassFeatures), bundledPlaces),
        gameArea,
      ),
    );
  };

  if (bundledFeatures.length > 0 && options?.onEnrich) {
    enrichInBackground(options.createEnrichTask, searchSpec, mergeWithOverpass, (merged) => {
      options.onEnrich?.(merged);
    });
    return withPins(bundledFeatures);
  }

  return mergeWithOverpass(overpassLoadFromTask(task, searchSpec));
}

async function fetchAdminMatchingFeaturesInArea(
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
  customMatchingAreas?: CustomMatchingAreasByLevel,
  load?: OverpassLoad,
): Promise<MatchingFeature[]> {
  const adminLevel = adminLevelForMatchingCategory(categoryId);
  if (adminLevel === null) {
    return [];
  }

  const customJson = customMatchingAreas?.[adminLevel as keyof CustomMatchingAreasByLevel];

  const divisions = await fetchAdminDivisionFeaturesInArea(gameArea, adminLevel, customJson, load);
  return divisions.map(adminDivisionToMatchingFeature);
}

async function fetchLandmassMatchingFeaturesInArea(
  gameArea: GameArea,
  regionPackId?: RegionPackId,
  load?: OverpassLoad,
): Promise<MatchingFeature[]> {
  const landmasses = await fetchLandmassFeaturesInArea(gameArea, regionPackId, load);
  return landmasses.map(landmassToMatchingFeature);
}

export async function fetchMatchingFeaturesInArea(
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
  options?: MatchingFetchOptions,
): Promise<MatchingFeature[]> {
  const customCategories = options?.customCategories ?? [];
  const category =
    resolveMatchingCategory(categoryId, customCategories) ?? getMatchingCategory(categoryId);

  const resolver = category.resolver;
  if (resolver === "overpassPoint") {
    return fetchOverpassPointMatchingFeaturesInArea(
      gameArea,
      categoryId,
      customCategories,
      options,
    );
  }

  const stage = matchingResolverStage(resolver, gameArea);
  return getOrFetchCached(
    matchingFeaturesCacheKey(gameArea, categoryId, options),
    async (context) => {
      const load = overpassLoadFromFetch(context);
      switch (resolver) {
        case "streetPath":
          return fetchStreetPathFeaturesInArea(gameArea, load);
        case "stationNameLength":
          return buildStationNameLengthFeatures(await fetchStationFeaturesInArea(gameArea, load));
        case "stationFirstLetter":
          return buildStationFirstLetterFeatures(await fetchStationFeaturesInArea(gameArea, load));
        case "letterZone": {
          const divisions = await fetchAdminDivisionFeaturesInArea(
            gameArea,
            4,
            options?.customMatchingAreas?.[4],
            load,
          );
          return buildLetterZoneFeatures(divisions);
        }
        case "reverseGeocodeAdmin":
          return fetchAdminMatchingFeaturesInArea(
            gameArea,
            categoryId,
            options?.customMatchingAreas,
            load,
          );
        case "landmass":
          return fetchLandmassMatchingFeaturesInArea(gameArea, options?.regionPackId, load);
        case "transitLine":
          return fetchTransitLineMatchingFeaturesInArea(gameArea, load);
        default: {
          const _exhaustive: never = resolver;
          return _exhaustive;
        }
      }
    },
    cachedFetchOptions(overpassLoadFromTask(options?.task, stage), stage, { persistEmpty: false }),
  );
}

function matchingResolverStage(
  resolver: Exclude<ReturnType<typeof getMatchingCategory>["resolver"], "overpassPoint">,
  gameArea: GameArea,
): StageSpec {
  const bbox = gameAreaToBoundingBox(gameArea);
  switch (resolver) {
    case "reverseGeocodeAdmin":
    case "letterZone":
      return {
        ...overpassSearchStage("overpass:admin-geom", bbox),
        label: "Loading area boundaries",
      };
    case "landmass":
      return { kind: "group", label: "Finding landmasses", historyKey: "matching:landmass" };
    default:
      return { ...overpassSearchStage("overpass:transit", bbox), label: "Searching transit data" };
  }
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
    resolveMatchingCategory(categoryId, customCategories) ?? getMatchingCategory(categoryId);

  if (category.resolver === "reverseGeocodeAdmin" || category.resolver === "letterZone") {
    const adminLevel =
      category.resolver === "letterZone" ? 4 : adminLevelForMatchingCategory(categoryId);
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
    const landmasses = await fetchLandmassFeaturesInArea(gameArea, options?.regionPackId);
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

  const features = await fetchMatchingFeaturesInArea(gameArea, categoryId, options);
  return pickNearestMatchingFeature(anchor, features);
}
