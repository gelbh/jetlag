import type { AnnotationRecord } from "./annotations";
import {
  collectUsedAnnotationOptions,
  firstUnusedCatalogOption,
  isCatalogOptionAvailable,
} from "./toolSessionOptions";
import {
  DEFAULT_RADIUS_METERS,
  formatDistance,
  milesToMeters,
  type DistanceUnit,
} from "./distance";
import {
  getMatchingCategory,
  MATCHING_CATEGORIES,
  matchingCategoryOverpassSelectors,
  type MatchingCategoryId,
} from "./matchingQuestions";

export const TENTACLE_SEARCH_RADIUS_METERS = DEFAULT_RADIUS_METERS;

export const TENTACLE_ANSWER_RADIUS_METERS = milesToMeters(1.5);

export const TENTACLE_NOT_WITHIN_REACH_LABEL = "Not within reach";

export const TENTACLE_LOCATION_CATEGORY_IDS = [
  "museum",
  "library",
  "movie_theater",
  "hospital",
] as const satisfies readonly MatchingCategoryId[];

export type TentacleLocationCategoryId =
  (typeof TENTACLE_LOCATION_CATEGORY_IDS)[number];

export type TentacleAnswerCategoryId = TentacleLocationCategoryId;

export interface TentacleLocationCategoryDefinition {
  id: TentacleLocationCategoryId;
  label: string;
  promptNoun: string;
}

const TENTACLE_PROMPT_TEMPLATE =
  "Within [DISTANCE] of me, which [TYPES] are you nearest to? (You must also be within [DISTANCE])";

export const TENTACLE_LOCATION_CATEGORIES = TENTACLE_LOCATION_CATEGORY_IDS.map(
  (id) => ({
    id,
    label: getMatchingCategory(id).label,
    promptNoun: getMatchingCategory(id).promptNoun,
  }),
) satisfies readonly TentacleLocationCategoryDefinition[];

export function getTentacleLocationCategory(
  categoryId: TentacleLocationCategoryId,
): TentacleLocationCategoryDefinition {
  return TENTACLE_LOCATION_CATEGORIES.find((item) => item.id === categoryId)!;
}

export function tentacleCategoryOverpassSelectors(
  categoryId: TentacleLocationCategoryId,
): readonly string[] {
  return matchingCategoryOverpassSelectors(categoryId);
}

export function tentacleLocationTypesLabel(categoryId: string): string {
  const known = TENTACLE_LOCATION_CATEGORIES.find((c) => c.id === categoryId);
  if (known) {
    return known.label.toLowerCase();
  }

  const legacy = MATCHING_CATEGORIES.find((c) => c.id === categoryId);
  if (legacy) {
    return legacy.label.toLowerCase();
  }

  return "locations";
}

export function tentacleQuestionPrompt(
  categoryId: string,
  unit: DistanceUnit,
  radiusMeters: number = TENTACLE_SEARCH_RADIUS_METERS,
): string {
  const distanceLabel = formatDistance(radiusMeters, unit);
  const typesLabel = tentacleLocationTypesLabel(categoryId);

  return TENTACLE_PROMPT_TEMPLATE.replaceAll(
    "[DISTANCE]",
    distanceLabel,
  ).replace("[TYPES]", typesLabel);
}

export function tentacleHiderAnswerClipboardText(
  categoryId: TentacleLocationCategoryId,
  unit: DistanceUnit,
  pois: readonly { name: string }[],
): string {
  const header = tentacleQuestionPrompt(categoryId, unit);
  if (pois.length === 0) {
    return header;
  }

  const lines = pois.map((poi, index) => `${index + 1}. ${poi.name.trim()}`);
  return `${header}\n\n${lines.join("\n")}\n\nThey may also answer: ${TENTACLE_NOT_WITHIN_REACH_LABEL}.`;
}

export function tentacleCategoryIdForAnnotation(
  annotation: AnnotationRecord,
): string | null {
  if (annotation.type !== "tentacle") {
    return null;
  }

  return (
    annotation.metadata.tentacleCategoryId ??
    annotation.metadata.tentacleAnswerCategory ??
    null
  );
}

const TENTACLE_CATEGORY_ID_SET = new Set<string>(
  TENTACLE_LOCATION_CATEGORY_IDS,
);

export function usedTentacleCategoryIds(
  annotations: AnnotationRecord[],
  exceptAnnotationId?: string,
): Set<TentacleLocationCategoryId> {
  const raw = collectUsedAnnotationOptions(
    annotations,
    (annotation) => tentacleCategoryIdForAnnotation(annotation),
    exceptAnnotationId,
  );
  const used = new Set<TentacleLocationCategoryId>();
  for (const id of raw) {
    if (id && TENTACLE_CATEGORY_ID_SET.has(id)) {
      used.add(id as TentacleLocationCategoryId);
    }
  }

  return used;
}

export function firstAvailableTentacleCategoryId(
  usedCategories: ReadonlySet<TentacleLocationCategoryId>,
): TentacleLocationCategoryId | null {
  return firstUnusedCatalogOption(TENTACLE_LOCATION_CATEGORIES, usedCategories);
}

export function isTentacleCategoryAvailable(
  categoryId: TentacleLocationCategoryId,
  usedCategories: ReadonlySet<TentacleLocationCategoryId>,
): boolean {
  return isCatalogOptionAvailable(categoryId, usedCategories);
}

export function defaultTentacleCategoryId(
  usedCategories: ReadonlySet<TentacleLocationCategoryId> = new Set(),
): TentacleLocationCategoryId {
  return firstAvailableTentacleCategoryId(usedCategories) ?? "museum";
}

export function tentacleAnswerLabel(
  annotation: AnnotationRecord,
): string | null {
  if (annotation.type !== "tentacle") {
    return null;
  }

  if (annotation.metadata.tentacleOutOfReach) {
    return TENTACLE_NOT_WITHIN_REACH_LABEL;
  }

  const answerPoiId = annotation.metadata.highlightedPoiId;

  if (answerPoiId) {
    return (
      annotation.metadata.tentacleAnswerPoiName ??
      annotation.metadata.pois?.find((poi) => poi.id === answerPoiId)?.name ??
      null
    );
  }

  if (annotation.metadata.tentacleAnswerCategory) {
    const id = annotation.metadata.tentacleAnswerCategory;
    const known = TENTACLE_LOCATION_CATEGORIES.find((c) => c.id === id);
    if (known) {
      return known.label;
    }

    const legacy = MATCHING_CATEGORIES.find((c) => c.id === id);
    return legacy?.label ?? null;
  }

  return null;
}

export function tentacleQuestionLabel(
  annotation: AnnotationRecord,
  distanceUnit: DistanceUnit = "metric",
): string {
  if (annotation.type !== "tentacle") {
    return "Tentacle";
  }

  const categoryId = tentacleCategoryIdForAnnotation(annotation);
  const radiusMeters = annotation.metadata.radiusMeters ?? milesToMeters(1);
  const prompt = categoryId
    ? tentacleQuestionPrompt(categoryId, distanceUnit, radiusMeters)
    : "Tentacle";
  const answer = tentacleAnswerLabel(annotation);

  if (!answer) {
    return `Tentacle · ${prompt}`;
  }

  return `Tentacle · ${prompt} · ${answer}`;
}

export function tentacleAnnotationSummary(
  annotation: AnnotationRecord,
  distanceUnit: DistanceUnit = "metric",
): string {
  return tentacleQuestionLabel(annotation, distanceUnit);
}
