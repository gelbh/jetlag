import type {
  MatchingCategoryDefinition,
  MatchingCategoryId,
} from "./matchingQuestions";
import {
  MATCHING_CATEGORIES,
  matchingUsesExpandedFeatureSearch,
} from "./matchingQuestions";
import type {
  MeasuringCatalogOption,
  MeasuringFromKind,
} from "./measuringQuestions";
import { MEASURING_CATALOG } from "./measuringQuestions";
import type { TentacleExtendedCategoryId } from "./tentacleQuestions";
import type { SessionRulesInput } from "./sessionRules";
import type {
  SessionCustomCategory,
  SessionCustomLocationPin,
} from "./sessionCustomContent";
import { isSessionCustomCategoryId } from "./sessionCustomContent";
import type { MeasuringPlace } from "../services/measuringPlaces";
import type { TentaclePoi } from "./annotations";
import type { LatLngTuple } from "./geometry";
import { distanceBetweenPoints } from "./geometry";

const CUSTOM_MATCHING_GROUP = "public_utilities" as const;

function mapIconPoiRule(promptNoun: string): string {
  return `Use the nearest ${promptNoun} on the map. Measure to its icon.`;
}

export function customCategoryToMatchingDefinition(
  category: SessionCustomCategory,
): MatchingCategoryDefinition {
  return {
    id: category.id as MatchingCategoryId,
    groupId: CUSTOM_MATCHING_GROUP,
    label: category.label,
    promptNoun: category.promptNoun,
    ruleSummary: mapIconPoiRule(category.promptNoun),
    phase: 1,
    resolver: "overpassPoint",
    overpassSelectors: category.overpassSelectors,
  };
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

export function resolveMatchingCategory(
  categoryId: string,
  customCategories: readonly SessionCustomCategory[] = [],
): MatchingCategoryDefinition | null {
  const builtIn = MATCHING_CATEGORIES.find((item) => item.id === categoryId);
  if (builtIn) {
    return builtIn;
  }

  const custom = customCategories.find((item) => item.id === categoryId);
  return custom ? customCategoryToMatchingDefinition(custom) : null;
}

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
      distanceMeters: distanceBetweenPoints(center, pin.point),
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
