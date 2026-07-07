import type { GameSize } from "../session/gameSize";
import {
  isTentacleCategoryAvailableForGameSize,
  tentacleOptionsForGameSize,
  tentacleRadiusMeters,
  type TentacleGameSizeCategoryId,
} from "../session/gameSizeRules";
import {
  resolveTentacleOptions,
  sessionGameSize,
  type SessionRulesInput,
} from "../session/sessionRules";
import type { AnnotationRecord } from "../map/annotations";
import type { PendingQuestionRecord } from "../session/sessionChat";
import { isCountablePendingQuestionStatus } from "./questionRules";
import {
  collectUsedAnnotationOptions,
  firstUnusedCatalogOption,
} from "../session/toolSessionOptions";
import {
  formatDistance,
  milesToMeters,
  type DistanceUnit,
} from "../map/distance";
import type { MatchingCategoryId } from "./matchingQuestions";
import {
  getMatchingCategory,
  MATCHING_CATEGORIES,
  matchingCategoryOverpassSelectors,
} from "./matchingQuestions";

export const TENTACLE_NOT_WITHIN_REACH_LABEL = "Not within reach";

export const TENTACLE_LOCATION_CATEGORY_IDS = [
  "museum",
  "library",
  "movie_theater",
  "hospital",
] as const satisfies readonly MatchingCategoryId[];

export type TentacleLocationCategoryId =
  (typeof TENTACLE_LOCATION_CATEGORY_IDS)[number];

export type TentacleExtendedCategoryId =
  | TentacleLocationCategoryId
  | "metro_line"
  | "zoo"
  | "aquarium"
  | "amusement_park"
  | `custom:${string}`
  | `pin:${string}`;

export type TentacleAnswerCategoryId = TentacleExtendedCategoryId;

export interface TentacleLocationCategoryDefinition {
  id: TentacleExtendedCategoryId;
  label: string;
  promptNoun: string;
}

const EXTENDED_CATEGORY_LABELS: Record<
  Exclude<TentacleExtendedCategoryId, TentacleLocationCategoryId>,
  { label: string; promptNoun: string }
> = {
  metro_line: { label: "Metro Line", promptNoun: "metro line" },
  zoo: { label: "Zoo", promptNoun: "zoo" },
  aquarium: { label: "Aquarium", promptNoun: "aquarium" },
  amusement_park: { label: "Amusement Park", promptNoun: "amusement park" },
};

const TENTACLE_PROMPT_TEMPLATE =
  "Within [DISTANCE] of me, which [TYPES] are you nearest to? (You must also be within [DISTANCE])";

function tentacleCategoryDefinition(
  categoryId: TentacleExtendedCategoryId,
): TentacleLocationCategoryDefinition {
  if (categoryId in EXTENDED_CATEGORY_LABELS) {
    return {
      id: categoryId,
      ...EXTENDED_CATEGORY_LABELS[
        categoryId as keyof typeof EXTENDED_CATEGORY_LABELS
      ],
    };
  }

  return {
    id: categoryId,
    label: getMatchingCategory(categoryId as MatchingCategoryId).label,
    promptNoun: getMatchingCategory(categoryId as MatchingCategoryId).promptNoun,
  };
}

export function tentacleCategoriesForGameSize(
  gameSize: GameSize,
): readonly TentacleLocationCategoryDefinition[] {
  return tentacleOptionsForGameSize(gameSize).map((option) =>
    tentacleCategoryDefinition(option.categoryId),
  );
}

export function tentacleCategoriesForSession(
  session: SessionRulesInput,
): readonly TentacleLocationCategoryDefinition[] {
  const builtIn = resolveTentacleOptions(session).map((option) =>
    tentacleCategoryDefinition(option.categoryId),
  );
  const custom = (session.customCategories ?? []).map((category) => ({
    id: category.id as TentacleExtendedCategoryId,
    label: category.label,
    promptNoun: category.promptNoun,
  }));
  return [...builtIn, ...custom];
}

export function getTentacleLocationCategory(
  categoryId: TentacleExtendedCategoryId,
): TentacleLocationCategoryDefinition {
  return tentacleCategoryDefinition(categoryId);
}

export function tentacleSearchRadiusMeters(
  categoryId: TentacleExtendedCategoryId,
  gameSize: GameSize,
): number {
  return tentacleRadiusMeters(categoryId as TentacleGameSizeCategoryId, gameSize);
}

export function tentacleSearchRadiusMetersForSession(
  session: SessionRulesInput,
  categoryId: TentacleExtendedCategoryId,
): number {
  const option = resolveTentacleOptions(session).find(
    (entry) => entry.categoryId === categoryId,
  );

  if (option) {
    return option.radiusMeters;
  }

  return tentacleSearchRadiusMeters(categoryId, sessionGameSize(session));
}

export function isTentacleCategoryAvailableForSession(
  session: SessionRulesInput,
  categoryId: string,
): boolean {
  return resolveTentacleOptions(session).some(
    (option) => option.categoryId === categoryId,
  );
}

/** @deprecated Use tentacleSearchRadiusMeters */
export const TENTACLE_SEARCH_RADIUS_METERS = milesToMeters(1);

/** @deprecated Unified radius — search and answer use the same distance */
export const TENTACLE_ANSWER_RADIUS_METERS = milesToMeters(1);

export function tentacleCategoryOverpassSelectors(
  categoryId: TentacleExtendedCategoryId,
): readonly string[] {
  if (categoryId === "metro_line") {
    return [
      "[route=light_rail]",
      "[route=subway]",
      "[route=tram]",
      "[route=monorail]",
    ];
  }

  return matchingCategoryOverpassSelectors(categoryId as MatchingCategoryId);
}

export function tentacleLocationTypesLabel(categoryId: string): string {
  const known = tentacleCategoryDefinition(categoryId as TentacleExtendedCategoryId);
  return known.promptNoun;
}

export function tentacleQuestionPrompt(
  categoryId: string,
  unit: DistanceUnit,
  radiusMeters: number,
): string {
  const distanceLabel = formatDistance(radiusMeters, unit);
  const typesLabel = tentacleLocationTypesLabel(categoryId);

  return TENTACLE_PROMPT_TEMPLATE.replaceAll(
    "[DISTANCE]",
    distanceLabel,
  ).replace("[TYPES]", typesLabel);
}

export function tentacleHiderAnswerClipboardText(
  categoryId: TentacleExtendedCategoryId,
  unit: DistanceUnit,
  pois: readonly { name: string }[],
  radiusMeters: number,
): string {
  const header = tentacleQuestionPrompt(categoryId, unit, radiusMeters);
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

export function usedTentacleCategoryIds(
  annotations: AnnotationRecord[],
  exceptAnnotationId?: string,
): Set<TentacleExtendedCategoryId> {
  const raw = collectUsedAnnotationOptions(
    annotations,
    (annotation) => tentacleCategoryIdForAnnotation(annotation),
    exceptAnnotationId,
  );
  return new Set(
    [...raw].filter((id): id is TentacleExtendedCategoryId => Boolean(id)),
  );
}

export function firstAvailableTentacleCategoryId(
  gameSize: GameSize,
  usedCategories: ReadonlySet<TentacleExtendedCategoryId> = new Set(),
): TentacleExtendedCategoryId | null {
  const categories = tentacleCategoriesForGameSize(gameSize);
  return firstUnusedCatalogOption(categories, usedCategories);
}

export function firstAvailableTentacleCategoryIdForSession(
  session: SessionRulesInput,
  usedCategories: ReadonlySet<TentacleExtendedCategoryId> = new Set(),
): TentacleExtendedCategoryId | null {
  const categories = tentacleCategoriesForSession(session);
  return firstUnusedCatalogOption(categories, usedCategories);
}

export function isTentacleCategoryAvailable(
  gameSize: GameSize,
  categoryId: TentacleExtendedCategoryId,
): boolean {
  return isTentacleCategoryAvailableForGameSize(gameSize, categoryId);
}

export function isTentacleCategoryAvailableInSession(
  session: SessionRulesInput,
  categoryId: TentacleExtendedCategoryId,
): boolean {
  return isTentacleCategoryAvailableForSession(session, categoryId);
}

export function defaultTentacleCategoryId(
  gameSize: GameSize,
  usedCategories: ReadonlySet<TentacleExtendedCategoryId> = new Set(),
): TentacleExtendedCategoryId {
  return firstAvailableTentacleCategoryId(gameSize, usedCategories) ?? "museum";
}

export function defaultTentacleCategoryIdForSession(
  session: SessionRulesInput,
  usedCategories: ReadonlySet<TentacleExtendedCategoryId> = new Set(),
): TentacleExtendedCategoryId {
  return (
    firstAvailableTentacleCategoryIdForSession(session, usedCategories) ??
    "museum"
  );
}

export function tentacleCategoryUseCount(
  annotations: readonly AnnotationRecord[],
  categoryId: TentacleExtendedCategoryId,
  exceptAnnotationId?: string,
): number {
  let count = 0;
  for (const annotation of annotations) {
    if (annotation.status !== "active" || annotation.type !== "tentacle") {
      continue;
    }
    if (exceptAnnotationId && annotation.id === exceptAnnotationId) {
      continue;
    }
    if (tentacleCategoryIdForAnnotation(annotation) === categoryId) {
      count += 1;
    }
  }
  return count;
}

export function readTentacleCategoryFromPending(
  question: PendingQuestionRecord,
): TentacleExtendedCategoryId | null {
  if (question.toolType !== "tentacle") {
    return null;
  }

  const categoryId = question.placement.metadata.tentacleCategoryId;
  return typeof categoryId === "string"
    ? (categoryId as TentacleExtendedCategoryId)
    : null;
}

export function tentacleCategoryUseCountFromPending(
  pendingQuestions: readonly PendingQuestionRecord[],
  categoryId: TentacleExtendedCategoryId,
  exceptQuestionId?: string,
): number {
  let count = 0;
  for (const question of pendingQuestions) {
    if (question.toolType !== "tentacle") {
      continue;
    }
    if (exceptQuestionId && question.id === exceptQuestionId) {
      continue;
    }
    if (!isCountablePendingQuestionStatus(question.status)) {
      continue;
    }
    if (readTentacleCategoryFromPending(question) === categoryId) {
      count += 1;
    }
  }
  return count;
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
    try {
      return tentacleCategoryDefinition(id as TentacleExtendedCategoryId).label;
    } catch {
      const legacy = MATCHING_CATEGORIES.find((c) => c.id === id);
      return legacy?.label ?? null;
    }
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
