import { milesToMeters } from "../map/distance";
import type { PendingQuestionToolType } from "../session/activity/sessionChat";
import {
  availableMatchingCategories,
  availableMeasuringCatalog,
} from "../session/catalog/sessionCatalogAvailability";
import { sessionDistanceUnit } from "../session/meta/sessionDistanceUnit";
import {
  resolveRadarPresetsMeters,
  resolveThermometerPresetsMeters,
  type SessionRulesInput,
  sessionGameSize,
} from "../session/rules";
import { photoCategoriesForGameSize, photoCategoryLabelForUnit } from "./photoQuestions";
import { radarDistanceOptionLabel } from "./radarQuestions";
import { tentacleCategoriesForSession } from "./tentacleQuestions";
import { thermometerDistanceLabel } from "./thermometerQuestions";

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
