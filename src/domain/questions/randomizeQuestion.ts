import type { AnnotationRecord } from "../map/annotations";
import { milesToMeters } from "../map/distance";
import type {
  PendingQuestionRecord,
  PendingQuestionToolType,
  RandomizedTo,
} from "../session/activity/sessionChat";
import { resolveCategoryPresence } from "../session/catalog/playAreaCategoryPresence";
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

const PRESENCE_RANDOMIZE_TOOLS: ReadonlySet<PendingQuestionToolType> = new Set([
  "matching",
  "measuring",
  "tentacle",
]);

/** Preload / admin signals for excluding empty Measuring / Matching / Tentacle ids. */
export type RandomizePresenceSource = {
  categoryPresenceCounts: Record<string, number> | null;
  isAdminUnavailable?: (categoryId: string) => boolean;
};

function filterOptionsByPlayAreaPresence(
  options: RandomizedTo[],
  toolType: PendingQuestionToolType,
  session: SessionRulesInput,
  presence?: RandomizePresenceSource,
): RandomizedTo[] {
  if (!PRESENCE_RANDOMIZE_TOOLS.has(toolType)) {
    return options;
  }
  const regionPackId = session.regionPackId;
  if (!regionPackId) {
    return options;
  }
  const probePending = presence?.categoryPresenceCounts === null;
  return options.filter((option) => {
    const categoryId = String(option.optionKey);
    return resolveCategoryPresence({
      categoryId,
      regionPackId,
      adminUnavailable: presence?.isAdminUnavailable?.(categoryId) ?? false,
      probeCount: presence?.categoryPresenceCounts?.[categoryId],
      probePending,
    }).available;
  });
}

export function questionOptionsForTool(
  toolType: PendingQuestionToolType,
  session: SessionRulesInput,
  presence?: RandomizePresenceSource,
): RandomizedTo[] {
  const unit = sessionDistanceUnit(session);
  let options: RandomizedTo[];
  switch (toolType) {
    case "matching":
      options = availableMatchingCategories(session).map((category) => ({
        optionKey: category.id,
        label: category.label,
      }));
      break;
    case "measuring":
      options = availableMeasuringCatalog(session).map((option) => ({
        optionKey: option.id,
        label: option.label,
      }));
      break;
    case "radar":
      options = resolveRadarPresetsMeters(session).map((meters) => ({
        optionKey: meters,
        label: radarDistanceOptionLabel(meters / milesToMeters(1), unit),
      }));
      break;
    case "thermometer":
      options = resolveThermometerPresetsMeters(session).map((meters) => ({
        optionKey: meters,
        label: thermometerDistanceLabel(meters, unit),
      }));
      break;
    case "tentacle":
      options = tentacleCategoriesForSession(session).map((category) => ({
        optionKey: category.id,
        label: category.label,
      }));
      break;
    case "photo":
      options = photoCategoriesForGameSize(sessionGameSize(session)).map((category) => ({
        optionKey: category.id,
        label: photoCategoryLabelForUnit(category.id, unit),
      }));
      break;
    default:
      return [];
  }
  return filterOptionsByPlayAreaPresence(options, toolType, session, presence);
}

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
      for (const key of usedThermometerDistanceOptionsForSession(
        annotations,
        pendingQuestions,
        unit,
      )) {
        const meters = unit === "metric" ? Number(key) : milesToMeters(Number(key));
        labels.add(thermometerDistanceLabel(meters, unit));
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

/** One option the seekers have not used yet (and not the current one), or null when none is left. */
export function pickRandomizeOption(
  pending: PendingQuestionRecord,
  session: SessionRulesInput,
  annotations: readonly AnnotationRecord[],
  pendingQuestions: readonly PendingQuestionRecord[],
  random: () => number = Math.random,
  presence?: RandomizePresenceSource,
): RandomizedTo | null {
  const exclude = randomizeExcludeLabelsForPending(pending, session, annotations, pendingQuestions);
  const pool = questionOptionsForTool(pending.toolType, session, presence).filter(
    (option) => !exclude.has(option.label),
  );
  return pool[Math.floor(random() * pool.length)] ?? null;
}

export function randomizedQuestionNotice(toolType: PendingQuestionToolType, label: string): string {
  if (toolType === "thermometer") {
    return `Hider played Randomize. Walk the ${label} thermometer instead.`;
  }
  return `Hider played Randomize. Sending: ${label}.`;
}

export function randomizeManualNotice(label: string): string {
  return `Randomize rolled ${label}. Could not build it automatically; ask it from the tool.`;
}

export const VETO_NOTICE = "Hider played Veto. No answer and no card draw for this question.";
