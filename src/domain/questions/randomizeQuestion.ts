import type { AnnotationRecord } from "../map/annotations";
import { milesToMeters } from "../map/distance";
import type {
  PendingQuestionRecord,
  PendingQuestionToolType,
} from "../session/activity/sessionChat";
import {
  availableMatchingCategories,
  availableMeasuringCatalog,
  resolveAvailableMatchingCategory,
  resolveAvailableMeasuringOption,
} from "../session/catalog/sessionCatalogAvailability";
import { sessionDistanceUnit } from "../session/meta/sessionDistanceUnit";
import {
  resolveRadarPresetsMeters,
  resolveThermometerPresetsMeters,
  type SessionRulesInput,
  sessionGameSize,
} from "../session/rules";
import {
  readMatchingCategoryFromPending,
  usedMatchingCategoryIdsForSession,
} from "./matchingQuestions";
import {
  readMeasuringFromKindFromPending,
  usedMeasuringFromKindsForSession,
} from "./measuringQuestions";
import {
  photoCategoriesForGameSize,
  photoCategoryLabelForUnit,
  readPhotoCategoryId,
  usedPhotoCategoryIds,
} from "./photoQuestions";
import {
  radarDistanceOptionForPending,
  radarDistanceOptionLabel,
  usedRadarDistanceOptionsForSession,
} from "./radarQuestions";
import {
  readTentacleCategoryFromPending,
  tentacleCategoriesForSession,
  usedTentacleCategoryIdsForSession,
} from "./tentacleQuestions";
import {
  thermometerDistanceLabel,
  usedThermometerDistanceOptionsForSession,
} from "./thermometerQuestions";

/** Questions the seekers could ask with this tool in this session. */
export function questionOptionLabelsForTool(
  toolType: PendingQuestionToolType,
  session: SessionRulesInput,
): string[] {
  const unit = sessionDistanceUnit(session);
  switch (toolType) {
    case "matching":
      return availableMatchingCategories(session).map((category) => category.label);
    case "measuring":
      return availableMeasuringCatalog(session).map((option) => option.label);
    case "radar":
      return resolveRadarPresetsMeters(session).map((meters) =>
        radarDistanceOptionLabel(meters / milesToMeters(1), unit),
      );
    case "thermometer":
      return resolveThermometerPresetsMeters(session).map((meters) =>
        thermometerDistanceLabel(meters, unit),
      );
    case "tentacle":
      return tentacleCategoriesForSession(session).map((category) => category.label);
    case "photo":
      return photoCategoriesForGameSize(sessionGameSize(session)).map((category) =>
        photoCategoryLabelForUnit(category.id, unit),
      );
    default:
      return [];
  }
}

/** Catalog label for one pending question option, or null when unknown. */
export function questionOptionLabelForPending(
  pending: PendingQuestionRecord,
  session: SessionRulesInput,
): string | null {
  const unit = sessionDistanceUnit(session);
  switch (pending.toolType) {
    case "matching": {
      const id = readMatchingCategoryFromPending(pending);
      return id ? (resolveAvailableMatchingCategory(id, session)?.label ?? null) : null;
    }
    case "measuring": {
      const id = readMeasuringFromKindFromPending(pending);
      return id ? (resolveAvailableMeasuringOption(id, session)?.label ?? null) : null;
    }
    case "radar": {
      const key = radarDistanceOptionForPending(pending, unit);
      if (key === null || key === "choose") {
        return null;
      }
      const miles = unit === "metric" ? Number(key) / milesToMeters(1) : Number(key);
      return radarDistanceOptionLabel(miles, unit);
    }
    case "thermometer": {
      const meters = pending.placement.metadata.thermometerDistanceMeters;
      return typeof meters === "number" ? thermometerDistanceLabel(meters, unit) : null;
    }
    case "tentacle": {
      const id = readTentacleCategoryFromPending(pending);
      if (!id) {
        return null;
      }
      return (
        tentacleCategoriesForSession(session).find((category) => category.id === id)?.label ?? null
      );
    }
    case "photo": {
      const id = readPhotoCategoryId(pending);
      return id ? photoCategoryLabelForUnit(id, unit) : null;
    }
    default:
      return null;
  }
}

/** Session-used option labels for a tool (annotations + sticky/open pending). */
export function usedQuestionOptionLabelsForTool(
  toolType: PendingQuestionToolType,
  session: SessionRulesInput,
  annotations: readonly AnnotationRecord[],
  pendingQuestions: readonly PendingQuestionRecord[],
): Set<string> {
  const unit = sessionDistanceUnit(session);
  const labels = new Set<string>();

  switch (toolType) {
    case "matching": {
      for (const id of usedMatchingCategoryIdsForSession(annotations, pendingQuestions)) {
        const label = resolveAvailableMatchingCategory(id, session)?.label;
        if (label) {
          labels.add(label);
        }
      }
      return labels;
    }
    case "measuring": {
      for (const id of usedMeasuringFromKindsForSession(annotations, pendingQuestions)) {
        const label = resolveAvailableMeasuringOption(id, session)?.label;
        if (label) {
          labels.add(label);
        }
      }
      return labels;
    }
    case "radar": {
      for (const key of usedRadarDistanceOptionsForSession(annotations, pendingQuestions, unit)) {
        if (key === "choose") {
          continue;
        }
        const miles = unit === "metric" ? Number(key) / milesToMeters(1) : Number(key);
        labels.add(radarDistanceOptionLabel(miles, unit));
      }
      return labels;
    }
    case "thermometer": {
      for (const miles of usedThermometerDistanceOptionsForSession(annotations, pendingQuestions)) {
        labels.add(thermometerDistanceLabel(milesToMeters(miles), unit));
      }
      return labels;
    }
    case "tentacle": {
      const catalog = tentacleCategoriesForSession(session);
      for (const id of usedTentacleCategoryIdsForSession(annotations, pendingQuestions)) {
        const label = catalog.find((category) => category.id === id)?.label;
        if (label) {
          labels.add(label);
        }
      }
      return labels;
    }
    case "photo": {
      for (const id of usedPhotoCategoryIds(pendingQuestions)) {
        labels.add(photoCategoryLabelForUnit(id, unit));
      }
      return labels;
    }
    default:
      return labels;
  }
}

/**
 * Labels randomize must not suggest: session-used for the tool plus the current option.
 */
export function randomizeExcludeLabelsForPending(
  pending: PendingQuestionRecord,
  session: SessionRulesInput,
  annotations: readonly AnnotationRecord[],
  pendingQuestions: readonly PendingQuestionRecord[],
): Set<string> {
  const exclude = usedQuestionOptionLabelsForTool(
    pending.toolType,
    session,
    annotations,
    pendingQuestions,
  );
  const current = questionOptionLabelForPending(pending, session);
  if (current) {
    exclude.add(current);
  }
  return exclude;
}

export type PickRandomizeOptionLabelOptions = {
  exclude?: ReadonlySet<string>;
  random?: () => number;
};

/** Pick one label from `labels` after removing `exclude` (used + current). */
export function pickRandomizeOptionLabel(
  labels: readonly string[],
  options: PickRandomizeOptionLabelOptions = {},
): string | null {
  const random = options.random ?? Math.random;
  const exclude = options.exclude;
  const pool = exclude ? labels.filter((label) => !exclude.has(label)) : labels;
  if (pool.length === 0) {
    return null;
  }
  return pool[Math.floor(random() * pool.length)] ?? null;
}

export type RandomizedQuestionNoticeOptions = PickRandomizeOptionLabelOptions;

/** Feed text for a Randomize card: names one random question from the same category. */
export function randomizedQuestionNotice(
  toolType: PendingQuestionToolType,
  session: SessionRulesInput,
  randomOrOptions: (() => number) | RandomizedQuestionNoticeOptions = Math.random,
): string {
  const options: RandomizedQuestionNoticeOptions =
    typeof randomOrOptions === "function" ? { random: randomOrOptions } : randomOrOptions;
  const labels = questionOptionLabelsForTool(toolType, session);
  const label = pickRandomizeOptionLabel(labels, options);
  return label
    ? `Hider played Randomize. Ask this ${toolType} question instead: ${label}.`
    : `Hider played Randomize. Ask a random ${toolType} question instead.`;
}

export const VETO_NOTICE = "Hider played Veto. No answer and no card draw for this question.";
