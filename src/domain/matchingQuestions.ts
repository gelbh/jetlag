import type { AnnotationRecord } from "./annotations";
import type { PendingQuestionRecord } from "./sessionChat";
import { isCountablePendingQuestionStatus } from "./questionRules";
import {
  collectUsedAnnotationOptions,
  firstUnusedCatalogOption,
} from "./toolSessionOptions";
import type { SessionCustomCategory } from "./sessionCustomContent";
import { resolveMatchingCategory } from "./sessionCustomCatalog";

export type MatchingAnswer = "yes" | "no";

export type MatchingResolver =
  | "overpassPoint"
  | "reverseGeocodeAdmin"
  | "transitLine"
  | "streetPath"
  | "stationNameLength"
  | "landmass";

export type MatchingCategoryId =
  | "commercial_airport"
  | "transit_line"
  | "station_name_length"
  | "street_or_path"
  | "admin_division_1"
  | "admin_division_2"
  | "admin_division_3"
  | "admin_division_4"
  | "mountain"
  | "landmass"
  | "park"
  | "amusement_park"
  | "zoo"
  | "aquarium"
  | "golf_course"
  | "museum"
  | "movie_theater"
  | "hospital"
  | "library"
  | "foreign_consulate"
  | `custom:${string}`;

export type MatchingCategoryGroupId =
  | "transit"
  | "administrative_divisions"
  | "natural"
  | "places_of_interest"
  | "public_utilities";

export interface MatchingCategoryDefinition {
  id: MatchingCategoryId;
  groupId: MatchingCategoryGroupId;
  label: string;
  promptNoun: string;
  ruleSummary: string;
  phase: 1 | 2;
  resolver: MatchingResolver;
  overpassSelectors?: readonly string[];
}

export interface MatchingCategoryGroupDefinition {
  id: MatchingCategoryGroupId;
  label: string;
}

export interface MatchingQuestionDefinition {
  category: MatchingCategoryId;
  prompt: string;
  ruleSummary: string;
}

function mapIconPoiRule(category: string): string {
  return `Use the nearest ${category} on the map. Measure to its icon.`;
}

export const MATCHING_CATEGORY_GROUPS = [
  { id: "transit", label: "Transit" },
  { id: "administrative_divisions", label: "Administrative Divisions" },
  { id: "natural", label: "Natural" },
  { id: "places_of_interest", label: "Places of Interest" },
  { id: "public_utilities", label: "Public utilities" },
] as const satisfies readonly MatchingCategoryGroupDefinition[];

export const MATCHING_CATEGORIES = [
  {
    id: "commercial_airport",
    groupId: "transit",
    label: "Commercial Airport",
    promptNoun: "commercial airport",
    ruleSummary:
      "Commercial if flights to or from it appear on Google Flights. Measure to the map icon.",
    phase: 1,
    resolver: "overpassPoint",
    overpassSelectors: [
      "[aeroway=aerodrome][iata]",
      "[aeroway=aerodrome][icao]",
    ],
  },
  {
    id: "transit_line",
    groupId: "transit",
    label: "Transit Line",
    promptNoun: "transit line",
    ruleSummary:
      "Ask only while riding public transit. Yes only if your transit stops at the same station.",
    phase: 1,
    resolver: "transitLine",
  },
  {
    id: "station_name_length",
    groupId: "transit",
    label: "Station Name's Length",
    promptNoun: "station name's length",
    ruleSummary:
      "Character count in the station name from your mapping app. Hyphens and spaces count; the word Station counts if shown.",
    phase: 1,
    resolver: "stationNameLength",
  },
  {
    id: "street_or_path",
    groupId: "transit",
    label: "Street or Path",
    promptNoun: "street or path",
    ruleSummary:
      "A street or path ends when it gets a different name. Unnamed segments start or end at intersections.",
    phase: 1,
    resolver: "streetPath",
  },
  {
    id: "admin_division_1",
    groupId: "administrative_divisions",
    label: "1st Administrative Division",
    promptNoun: "1st administrative division",
    ruleSummary:
      "Largest formal division (for example US states, Swiss cantons, Japanese prefectures).",
    phase: 1,
    resolver: "reverseGeocodeAdmin",
  },
  {
    id: "admin_division_2",
    groupId: "administrative_divisions",
    label: "2nd Administrative Division",
    promptNoun: "2nd administrative division",
    ruleSummary:
      "Next level down (for example US counties, Swiss districts, Japanese subprefectures).",
    phase: 1,
    resolver: "reverseGeocodeAdmin",
  },
  {
    id: "admin_division_3",
    groupId: "administrative_divisions",
    label: "3rd Administrative Division",
    promptNoun: "3rd administrative division",
    ruleSummary:
      "Municipality-level division. Clarify ambiguous borders when asking.",
    phase: 1,
    resolver: "reverseGeocodeAdmin",
  },
  {
    id: "admin_division_4",
    groupId: "administrative_divisions",
    label: "4th Administrative Division",
    promptNoun: "4th administrative division",
    ruleSummary:
      "Smaller city subdivisions where they exist (for example NYC boroughs, Zurich districts).",
    phase: 1,
    resolver: "reverseGeocodeAdmin",
  },
  {
    id: "mountain",
    groupId: "natural",
    label: "Mountain",
    promptNoun: "mountain",
    ruleSummary: mapIconPoiRule("mountain"),
    phase: 1,
    resolver: "overpassPoint",
    overpassSelectors: [
      "[natural=peak]",
      "[natural=volcano]",
      "[place=mountain]",
    ],
  },
  {
    id: "landmass",
    groupId: "natural",
    label: "Landmass",
    promptNoun: "landmass",
    ruleSummary:
      "An area of land in one piece within the play area, not split by a waterway. If one landmass surrounds another, that counts as a match.",
    phase: 1,
    resolver: "landmass",
  },
  {
    id: "park",
    groupId: "natural",
    label: "Park",
    promptNoun: "park",
    ruleSummary: mapIconPoiRule("park"),
    phase: 1,
    resolver: "overpassPoint",
    overpassSelectors: ["[leisure=park]", "[leisure=nature_reserve]"],
  },
  {
    id: "amusement_park",
    groupId: "places_of_interest",
    label: "Amusement Park",
    promptNoun: "amusement park",
    ruleSummary: mapIconPoiRule("amusement park"),
    phase: 1,
    resolver: "overpassPoint",
    overpassSelectors: ["[tourism=theme_park]"],
  },
  {
    id: "zoo",
    groupId: "places_of_interest",
    label: "Zoo",
    promptNoun: "zoo",
    ruleSummary: mapIconPoiRule("zoo"),
    phase: 1,
    resolver: "overpassPoint",
    overpassSelectors: ["[tourism=zoo]"],
  },
  {
    id: "aquarium",
    groupId: "places_of_interest",
    label: "Aquarium",
    promptNoun: "aquarium",
    ruleSummary: mapIconPoiRule("aquarium"),
    phase: 1,
    resolver: "overpassPoint",
    overpassSelectors: ["[tourism=aquarium]", "[amenity=aquarium]"],
  },
  {
    id: "golf_course",
    groupId: "places_of_interest",
    label: "Golf Course",
    promptNoun: "golf course",
    ruleSummary:
      "Outdoor golf courses only. Miniature golf and driving ranges do not count. Measure from the map icon.",
    phase: 1,
    resolver: "overpassPoint",
    overpassSelectors: ["[leisure=golf_course]"],
  },
  {
    id: "museum",
    groupId: "places_of_interest",
    label: "Museum",
    promptNoun: "museum",
    ruleSummary: mapIconPoiRule("museum"),
    phase: 1,
    resolver: "overpassPoint",
    overpassSelectors: ["[tourism=museum]", "[amenity=museum]"],
  },
  {
    id: "movie_theater",
    groupId: "places_of_interest",
    label: "Movie Theater",
    promptNoun: "movie theater",
    ruleSummary: mapIconPoiRule("movie theater"),
    phase: 1,
    resolver: "overpassPoint",
    overpassSelectors: ["[amenity=cinema]"],
  },
  {
    id: "hospital",
    groupId: "public_utilities",
    label: "Hospital",
    promptNoun: "hospital",
    ruleSummary: mapIconPoiRule("hospital"),
    phase: 1,
    resolver: "overpassPoint",
    overpassSelectors: ["[amenity=hospital]"],
  },
  {
    id: "library",
    groupId: "public_utilities",
    label: "Library",
    promptNoun: "library",
    ruleSummary: mapIconPoiRule("library"),
    phase: 1,
    resolver: "overpassPoint",
    overpassSelectors: ["[amenity=library]"],
  },
  {
    id: "foreign_consulate",
    groupId: "public_utilities",
    label: "Foreign Consulate",
    promptNoun: "foreign consulate",
    ruleSummary:
      "Foreign consulates only; exclude honorary consulates. Measure distance from the map icon.",
    phase: 1,
    resolver: "overpassPoint",
    overpassSelectors: [
      "[office=diplomatic][diplomatic=consulate]",
      "[amenity=embassy][embassy=consulate]",
    ],
  },
] as const satisfies readonly MatchingCategoryDefinition[];

export function getMatchingCategory(
  categoryId: MatchingCategoryId,
): MatchingCategoryDefinition {
  return MATCHING_CATEGORIES.find((item) => item.id === categoryId)!;
}

export function matchingCategoryLabel(categoryId: MatchingCategoryId): string {
  return getMatchingCategory(categoryId).label;
}

export function matchingCategoryOverpassSelectors(
  categoryId: MatchingCategoryId,
): readonly string[] {
  return getMatchingCategory(categoryId).overpassSelectors ?? [];
}

export function matchingQuestionFor(
  categoryId: MatchingCategoryId,
  customCategories: readonly SessionCustomCategory[] = [],
): MatchingQuestionDefinition {
  const category =
    resolveMatchingCategory(categoryId, customCategories) ??
    getMatchingCategory(categoryId);

  return {
    category: categoryId,
    prompt: `Is your nearest ${category.promptNoun} the same as my nearest ${category.promptNoun}?`,
    ruleSummary: category.ruleSummary,
  };
}

export function matchingQuestionLabel(categoryId: MatchingCategoryId): string {
  return `Match · ${matchingCategoryLabel(categoryId).toLowerCase()}`;
}

export function isMatchingCategoryEnabled(
  categoryId: MatchingCategoryId,
): boolean {
  return getMatchingCategory(categoryId).phase === 1;
}

export function usedMatchingCategoryIds(
  annotations: AnnotationRecord[],
  exceptAnnotationId?: string,
): Set<MatchingCategoryId> {
  return collectUsedAnnotationOptions(
    annotations,
    (annotation) => {
      if (annotation.type !== "matching") {
        return null;
      }

      return annotation.metadata.matchingCategory ?? null;
    },
    exceptAnnotationId,
  );
}

export function firstAvailableMatchingCategoryId(
  usedCategories: ReadonlySet<MatchingCategoryId>,
): MatchingCategoryId | null {
  return firstUnusedCatalogOption(
    MATCHING_CATEGORIES,
    usedCategories,
    (categoryId) => isMatchingCategoryEnabled(categoryId),
  );
}

export function isMatchingCategoryAvailable(
  categoryId: MatchingCategoryId,
): boolean {
  return isMatchingCategoryEnabled(categoryId);
}

export function matchingCategoryUseCount(
  annotations: readonly AnnotationRecord[],
  categoryId: MatchingCategoryId,
  exceptAnnotationId?: string,
): number {
  let count = 0;
  for (const annotation of annotations) {
    if (annotation.status !== "active" || annotation.type !== "matching") {
      continue;
    }
    if (exceptAnnotationId && annotation.id === exceptAnnotationId) {
      continue;
    }
    if (annotation.metadata.matchingCategory === categoryId) {
      count += 1;
    }
  }
  return count;
}

export function readMatchingCategoryFromPending(
  question: PendingQuestionRecord,
): MatchingCategoryId | null {
  if (question.toolType !== "matching") {
    return null;
  }

  const categoryId = question.placement.metadata.matchingCategory;
  return typeof categoryId === "string"
    ? (categoryId as MatchingCategoryId)
    : null;
}

export function matchingCategoryUseCountFromPending(
  pendingQuestions: readonly PendingQuestionRecord[],
  categoryId: MatchingCategoryId,
  exceptQuestionId?: string,
): number {
  let count = 0;
  for (const question of pendingQuestions) {
    if (question.toolType !== "matching") {
      continue;
    }
    if (exceptQuestionId && question.id === exceptQuestionId) {
      continue;
    }
    if (!isCountablePendingQuestionStatus(question.status)) {
      continue;
    }
    if (readMatchingCategoryFromPending(question) === categoryId) {
      count += 1;
    }
  }
  return count;
}

export function defaultMatchingCategoryId(
  usedCategories: ReadonlySet<MatchingCategoryId> = new Set(),
): MatchingCategoryId {
  return (
    firstAvailableMatchingCategoryId(usedCategories) ?? "commercial_airport"
  );
}

export function adminLevelForMatchingCategory(
  categoryId: MatchingCategoryId,
): number | null {
  switch (categoryId) {
    case "admin_division_1":
      return 4;
    case "admin_division_2":
      return 6;
    case "admin_division_3":
      return 8;
    case "admin_division_4":
      return 9;
    default:
      return null;
  }
}

export function matchingUsesExpandedFeatureSearch(
  category: MatchingCategoryDefinition,
): boolean {
  return (
    category.resolver === "overpassPoint" ||
    category.resolver === "streetPath" ||
    category.resolver === "stationNameLength" ||
    category.resolver === "transitLine"
  );
}
