import type { AnnotationRecord } from "../map/annotations";
import type { PendingQuestionRecord } from "../session/sessionChat";
import { resolveCustomPackMatchingCategory } from "./customQuestionPack";
import type { SessionCustomCategory } from "../session/sessionCustomContent";
import {
  customCategoryToMatchingDefinition,
  MATCHING_CATEGORIES,
  type MatchingCategoryDefinition,
  type MatchingCategoryId,
  type MatchingQuestionDefinition,
} from "./matching/matchingCatalog";
import { buildCatalogHelpers } from "./catalogHelpers";

export type {
  MatchingAnswer,
  MatchingCategoryDefinition,
  MatchingCategoryGroupDefinition,
  MatchingCategoryGroupId,
  MatchingCategoryId,
  MatchingQuestionDefinition,
  MatchingResolver,
} from "./matching/matchingCatalog";

export {
  customCategoryToMatchingDefinition,
  MATCHING_CATEGORIES,
  MATCHING_CATEGORY_GROUPS,
} from "./matching/matchingCatalog";

function readMatchingCategoryFromAnnotation(
  annotation: AnnotationRecord,
): MatchingCategoryId | null {
  if (annotation.type !== "matching") {
    return null;
  }

  const categoryId = annotation.metadata.matchingCategory;
  return typeof categoryId === "string"
    ? (categoryId as MatchingCategoryId)
    : null;
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

const matchingCatalogHelpers = buildCatalogHelpers<MatchingCategoryId>({
  toolType: "matching",
  readOptionFromAnnotation: readMatchingCategoryFromAnnotation,
  readOptionFromPending: readMatchingCategoryFromPending,
});

export function resolveMatchingCategory(
  categoryId: string,
  customCategories: readonly SessionCustomCategory[] = [],
): MatchingCategoryDefinition | null {
  const builtIn = MATCHING_CATEGORIES.find((item) => item.id === categoryId);
  if (builtIn) {
    return builtIn;
  }

  const pack = resolveCustomPackMatchingCategory(categoryId);
  if (pack) {
    return pack;
  }

  const custom = customCategories.find((item) => item.id === categoryId);
  return custom ? customCategoryToMatchingDefinition(custom) : null;
}

export function getMatchingCategory(
  categoryId: MatchingCategoryId,
): MatchingCategoryDefinition {
  return (
    resolveMatchingCategory(categoryId) ?? MATCHING_CATEGORIES[0]!
  );
}

export function matchingCategoryLabel(categoryId: MatchingCategoryId): string {
  return resolveMatchingCategory(categoryId)?.label ?? categoryId;
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
  const category = resolveMatchingCategory(categoryId);
  return category?.phase === 1;
}

export function usedMatchingCategoryIds(
  annotations: AnnotationRecord[],
  exceptAnnotationId?: string,
): Set<MatchingCategoryId> {
  return matchingCatalogHelpers.usedOptionsFromAnnotations(
    annotations,
    exceptAnnotationId,
  );
}

export function firstAvailableMatchingCategoryId(
  usedCategories: ReadonlySet<MatchingCategoryId>,
): MatchingCategoryId | null {
  return matchingCatalogHelpers.firstAvailableFromCatalog(
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
  return matchingCatalogHelpers.optionUseCountFromAnnotations(
    annotations,
    categoryId,
    exceptAnnotationId,
  );
}

export function matchingCategoryUseCountFromPending(
  pendingQuestions: readonly PendingQuestionRecord[],
  categoryId: MatchingCategoryId,
  exceptQuestionId?: string,
): number {
  return matchingCatalogHelpers.optionUseCountFromPending(
    pendingQuestions,
    categoryId,
    exceptQuestionId,
  );
}

export function defaultMatchingCategoryId(
  usedCategories: ReadonlySet<MatchingCategoryId> = new Set(),
): MatchingCategoryId {
  return matchingCatalogHelpers.defaultFromCatalog(
    MATCHING_CATEGORIES,
    usedCategories,
    "commercial_airport",
    (categoryId) => isMatchingCategoryEnabled(categoryId),
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
