import type {
  MatchingCategoryDefinition,
  MatchingCategoryId,
} from "../questions/matchingQuestions";
import {
  MATCHING_CATEGORIES,
  customCategoryToMatchingDefinition,
  matchingUsesExpandedFeatureSearch,
  resolveMatchingCategory,
} from "../questions/matchingQuestions";
import type {
  MeasuringCatalogOption,
  MeasuringFromKind,
} from "../questions/measuringQuestions";
import { MEASURING_CATALOG } from "../questions/measuringQuestions";
import type { TentacleExtendedCategoryId } from "../questions/tentacleQuestions";
import type { SessionRulesInput } from "./sessionRules";
import type {
  SessionCustomCategory,
  SessionCustomLocationPin,
} from "./sessionCustomContent";
import { isSessionCustomCategoryId } from "./sessionCustomContent";
import type { MeasuringPlace } from "../../services/geo/measuringPlaces";
import type { TentaclePoi } from "../map/annotations";
import type { LatLngTuple } from "../geometry/geometry";
import turfDistance from "@turf/distance";
import { point as turfPoint } from "@turf/helpers";

function distanceBetweenLatLngPoints(
  from: LatLngTuple,
  to: LatLngTuple,
): number {
  return turfDistance(turfPoint([from[1], from[0]]), turfPoint([to[1], to[0]]), {
    units: "meters",
  });
}

export function customCategoryToMeasuringOption(
  category: SessionCustomCategory,
): MeasuringCatalogOption {
  return {
    id: category.id as MeasuringFromKind,
    groupId: "poi",
    label: category.label,
    promptNoun: category.promptNoun.startsWith("a ")
      ? category.promptNoun
      : `a ${category.promptNoun}`,
    subject: "location",
    targetKind: "point",
    overpassSelectors: category.overpassSelectors,
    linearSelectors: [],
    supportsSearch: false,
    supportsNearest: true,
    supportsMapTarget: true,
  };
}

export { resolveMatchingCategory };

export function matchingCategoriesForSession(
  customCategories: readonly SessionCustomCategory[] = [],
): MatchingCategoryDefinition[] {
  return [
    ...MATCHING_CATEGORIES,
    ...customCategories.map(customCategoryToMatchingDefinition),
  ];
}

export function measuringCatalogForSession(
  customCategories: readonly SessionCustomCategory[] = [],
): MeasuringCatalogOption[] {
  const customOptions = customCategories.map(customCategoryToMeasuringOption);
  return [...MEASURING_CATALOG, ...customOptions];
}

export function resolveMeasuringCatalogOption(
  kind: MeasuringFromKind,
  customCategories: readonly SessionCustomCategory[] = [],
): MeasuringCatalogOption | undefined {
  const builtIn = MEASURING_CATALOG.find((item) => item.id === kind);
  if (builtIn) {
    return builtIn;
  }

  const custom = customCategories.find((item) => item.id === kind);
  return custom ? customCategoryToMeasuringOption(custom) : undefined;
}

export function isCustomSessionCategoryId(id: string): boolean {
  return isSessionCustomCategoryId(id);
}

export function customCategoryForId(
  categoryId: string,
  customCategories: readonly SessionCustomCategory[] = [],
): SessionCustomCategory | undefined {
  return customCategories.find((item) => item.id === categoryId);
}

export function matchingOverpassSelectorsForCategory(
  categoryId: MatchingCategoryId,
  customCategories: readonly SessionCustomCategory[] = [],
): readonly string[] {
  const category = resolveMatchingCategory(categoryId, customCategories);
  return category?.overpassSelectors ?? [];
}

export function measuringOverpassSelectorsForKind(
  kind: MeasuringFromKind,
  customCategories: readonly SessionCustomCategory[] = [],
): readonly string[] {
  return resolveMeasuringCatalogOption(kind, customCategories)?.overpassSelectors ?? [];
}

export function tentacleOverpassSelectorsForCategory(
  categoryId: TentacleExtendedCategoryId,
  customCategories: readonly SessionCustomCategory[] = [],
): readonly string[] {
  if (categoryId === "metro_line") {
    return [
      "[route=light_rail]",
      "[route=subway]",
      "[route=tram]",
      "[route=monorail]",
    ];
  }

  if (isSessionCustomCategoryId(categoryId)) {
    return (
      customCategories.find((item) => item.id === categoryId)
        ?.overpassSelectors ?? []
    );
  }

  return matchingOverpassSelectorsForCategory(
    categoryId as MatchingCategoryId,
    customCategories,
  );
}

export function manualPinAsMeasuringPlace(
  pin: SessionCustomLocationPin,
): MeasuringPlace {
  return {
    id: pin.id,
    name: pin.name,
    point: pin.point,
  };
}

export function manualPinsWithinRadius(
  pins: readonly SessionCustomLocationPin[],
  center: LatLngTuple,
  radiusMeters: number,
  categoryId: TentacleExtendedCategoryId,
): TentaclePoi[] {
  return pins
    .map((pin) => ({
      id: pin.id,
      name: pin.name,
      lat: pin.point[0],
      lng: pin.point[1],
      category: categoryId,
      distanceMeters: distanceBetweenLatLngPoints(center, pin.point),
    }))
    .filter((poi) => poi.distanceMeters <= radiusMeters)
    .map((poi) => ({
      id: poi.id,
      name: poi.name,
      lat: poi.lat,
      lng: poi.lng,
      category: poi.category,
    }));
}

export function sessionCustomContentFromRules(
  session: SessionRulesInput,
): {
  customMatchingAreas: SessionRulesInput["customMatchingAreas"];
  customCategories: readonly SessionCustomCategory[];
  customLocationPins: readonly SessionCustomLocationPin[];
} {
  return {
    customMatchingAreas: session.customMatchingAreas,
    customCategories: session.customCategories ?? [],
    customLocationPins: session.customLocationPins ?? [],
  };
}

export function matchingUsesExpandedSearchForCategory(
  categoryId: MatchingCategoryId,
  customCategories: readonly SessionCustomCategory[] = [],
): boolean {
  const category = resolveMatchingCategory(categoryId, customCategories);
  if (!category) {
    return false;
  }

  return matchingUsesExpandedFeatureSearch(category);
}
