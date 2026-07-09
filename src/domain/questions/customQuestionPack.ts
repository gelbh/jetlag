import type {
  MatchingCategoryDefinition,
  MatchingCategoryId,
} from "./matchingQuestions";
import type {
  MeasuringCatalogOption,
  MeasuringFromKind,
} from "./measuringQuestions";

export const CUSTOM_QUESTION_PACK_PREFIX = "pack:" as const;

export type CustomPackMatchingCategoryId =
  `${typeof CUSTOM_QUESTION_PACK_PREFIX}major_city` |
  `${typeof CUSTOM_QUESTION_PACK_PREFIX}letter_zone` |
  `${typeof CUSTOM_QUESTION_PACK_PREFIX}same_first_letter_station`;

export type CustomPackMeasuringFromKind =
  `${typeof CUSTOM_QUESTION_PACK_PREFIX}seven_eleven` |
  `${typeof CUSTOM_QUESTION_PACK_PREFIX}mcdonalds` |
  `${typeof CUSTOM_QUESTION_PACK_PREFIX}major_city`;

export function isCustomPackMatchingCategoryId(
  id: string,
): id is CustomPackMatchingCategoryId {
  return (
    id === `${CUSTOM_QUESTION_PACK_PREFIX}major_city` ||
    id === `${CUSTOM_QUESTION_PACK_PREFIX}letter_zone` ||
    id === `${CUSTOM_QUESTION_PACK_PREFIX}same_first_letter_station`
  );
}

export function isCustomPackMeasuringFromKind(
  id: string,
): id is CustomPackMeasuringFromKind {
  return (
    id === `${CUSTOM_QUESTION_PACK_PREFIX}seven_eleven` ||
    id === `${CUSTOM_QUESTION_PACK_PREFIX}mcdonalds` ||
    id === `${CUSTOM_QUESTION_PACK_PREFIX}major_city`
  );
}

export function isCustomQuestionPackCategoryId(id: string): boolean {
  return id.startsWith(CUSTOM_QUESTION_PACK_PREFIX);
}

export const CUSTOM_QUESTION_PACK_MATCHING: readonly MatchingCategoryDefinition[] =
  [
    {
      id: `${CUSTOM_QUESTION_PACK_PREFIX}major_city` as MatchingCategoryId,
      groupId: "administrative_divisions",
      label: "Major city",
      promptNoun: "major city",
      ruleSummary:
        "A city or town visible on your mapping app. Measure to its map label.",
      phase: 1,
      resolver: "overpassPoint",
      overpassSelectors: ['[place=city]', '[place=town]'],
    },
    {
      id: `${CUSTOM_QUESTION_PACK_PREFIX}letter_zone` as MatchingCategoryId,
      groupId: "administrative_divisions",
      label: "Letter zone",
      promptNoun: "letter zone",
      ruleSummary:
        "The first letter of your current administrative zone name (from your mapping app). Compare first letters only.",
      phase: 1,
      resolver: "letterZone",
    },
    {
      id: `${CUSTOM_QUESTION_PACK_PREFIX}same_first_letter_station` as MatchingCategoryId,
      groupId: "transit",
      label: "Same first letter station",
      promptNoun: "station first letter",
      ruleSummary:
        "The first letter of your nearest transit station name. Compare first letters only.",
      phase: 1,
      resolver: "stationFirstLetter",
    },
  ];

export const CUSTOM_QUESTION_PACK_MEASURING: readonly MeasuringCatalogOption[] =
  [
    {
      id: `${CUSTOM_QUESTION_PACK_PREFIX}seven_eleven` as MeasuringFromKind,
      groupId: "poi",
      label: "7-Eleven",
      promptNoun: "a 7-Eleven",
      subject: "location",
      targetKind: "point",
      overpassSelectors: [
        '["brand"="7-Eleven"]',
        '["name"~"7.?Eleven",i]',
        '["shop"="convenience"]["name"~"7.?Eleven",i]',
      ],
      linearSelectors: [],
      supportsSearch: false,
      supportsNearest: true,
      supportsMapTarget: true,
    },
    {
      id: `${CUSTOM_QUESTION_PACK_PREFIX}mcdonalds` as MeasuringFromKind,
      groupId: "poi",
      label: "McDonald's",
      promptNoun: "a McDonald's",
      subject: "location",
      targetKind: "point",
      overpassSelectors: [
        '["brand"="McDonald\'s"]',
        '["brand"="McDonalds"]',
        '["amenity"="fast_food"]["name"~"McDonald",i]',
      ],
      linearSelectors: [],
      supportsSearch: false,
      supportsNearest: true,
      supportsMapTarget: true,
    },
    {
      id: `${CUSTOM_QUESTION_PACK_PREFIX}major_city` as MeasuringFromKind,
      groupId: "poi",
      label: "Major city",
      promptNoun: "a major city",
      subject: "location",
      targetKind: "point",
      overpassSelectors: ['[place=city]', '[place=town]'],
      linearSelectors: [],
      supportsSearch: false,
      supportsNearest: true,
      supportsMapTarget: true,
    },
  ];

export function resolveCustomPackMatchingCategory(
  categoryId: string,
): MatchingCategoryDefinition | null {
  return (
    CUSTOM_QUESTION_PACK_MATCHING.find((item) => item.id === categoryId) ??
    null
  );
}

export function resolveCustomPackMeasuringOption(
  kind: string,
): MeasuringCatalogOption | null {
  return (
    CUSTOM_QUESTION_PACK_MEASURING.find((item) => item.id === kind) ?? null
  );
}
