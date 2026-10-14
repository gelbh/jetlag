import type { AnnotationRecord } from "../map/annotations";
import { type DistanceUnit, formatPresetDistance, milesToMeters } from "../map/distance";
import {
  METRIC_THERMOMETER_PRESET_METERS,
  matchPresetMeters,
  UI_PRESET_MATCH_TOLERANCE_METERS,
} from "../map/distancePresets";
import type { PendingQuestionRecord } from "../session/activity/sessionChat";
import { sessionDistanceUnit } from "../session/meta/sessionDistanceUnit";
import {
  resolveIsThermometerPresetAvailable,
  resolveThermometerPresetsMeters,
  type SessionRulesInput,
} from "../session/rules";
import type { GameSize } from "../session/size/gameSize";
import { thermometerPresetsMetersForGameSize } from "../session/size/gameSizeRules";
import { buildPresetCatalogHelpers, presetMilesForDistanceMeters } from "./distancePresets";

export type ThermometerAnswer = "hotter" | "colder";

export const THERMOMETER_DISTANCE_PRESETS_MILES = [0.5, 3, 10, 50] as const;

export type ThermometerDistanceOptionMiles = (typeof THERMOMETER_DISTANCE_PRESETS_MILES)[number];

/** Used-set keys: imperial mile ladders or metric meter ladders (radar twin). */
export type ThermometerDistanceOptionKey =
  | ThermometerDistanceOptionMiles
  | (typeof METRIC_THERMOMETER_PRESET_METERS)[number];

export const THERMOMETER_DISTANCE_PRESETS = THERMOMETER_DISTANCE_PRESETS_MILES.map(milesToMeters);

export const DEFAULT_THERMOMETER_DISTANCE_METERS = THERMOMETER_DISTANCE_PRESETS[0];

const THERMOMETER_PRESET_MATCH_TOLERANCE_METERS = 1;

export function thermometerPresetMilesForMeters(
  distanceMeters: number,
): ThermometerDistanceOptionMiles | null {
  return presetMilesForDistanceMeters(
    distanceMeters,
    THERMOMETER_DISTANCE_PRESETS_MILES,
    milesToMeters,
    THERMOMETER_PRESET_MATCH_TOLERANCE_METERS,
  );
}

export function thermometerPresetForDistance(
  distanceMeters: number,
  unit: DistanceUnit = "imperial",
): ThermometerDistanceOptionKey | null {
  if (unit === "metric") {
    const preset = matchPresetMeters(
      distanceMeters,
      METRIC_THERMOMETER_PRESET_METERS,
      UI_PRESET_MATCH_TOLERANCE_METERS,
    );
    return preset as ThermometerDistanceOptionKey | null;
  }

  return thermometerPresetMilesForMeters(distanceMeters);
}

export function thermometerDistanceOptionForAnnotation(
  annotation: AnnotationRecord,
  unit: DistanceUnit = "imperial",
): ThermometerDistanceOptionKey | null {
  if (
    annotation.type !== "thermometer" ||
    annotation.metadata.thermometerDistanceMeters === undefined
  ) {
    return null;
  }

  return thermometerPresetForDistance(annotation.metadata.thermometerDistanceMeters, unit);
}

function thermometerDistanceOptionForPending(
  question: PendingQuestionRecord,
  unit: DistanceUnit = "imperial",
): ThermometerDistanceOptionKey | null {
  if (question.toolType !== "thermometer") {
    return null;
  }

  const pendingDistance = question.placement.metadata.thermometerDistanceMeters;
  if (typeof pendingDistance !== "number") {
    return null;
  }

  return thermometerPresetForDistance(pendingDistance, unit);
}

function thermometerPresetHelpersForUnit(unit: DistanceUnit) {
  return buildPresetCatalogHelpers<ThermometerDistanceOptionKey>({
    toolType: "thermometer",
    readOptionFromAnnotation: (annotation) =>
      thermometerDistanceOptionForAnnotation(annotation, unit),
    readOptionFromPending: (question) => thermometerDistanceOptionForPending(question, unit),
  });
}

export function usedThermometerDistanceOptions(
  annotations: readonly AnnotationRecord[],
  exceptAnnotationId?: string,
  unit: DistanceUnit = "imperial",
): Set<ThermometerDistanceOptionKey> {
  return thermometerPresetHelpersForUnit(unit).usedOptionsFromAnnotations(
    annotations,
    exceptAnnotationId,
  );
}

export function usedThermometerDistanceOptionsForSession(
  annotations: readonly AnnotationRecord[],
  pendingQuestions: readonly PendingQuestionRecord[],
  exceptAnnotationId?: string,
  exceptQuestionId?: string,
  unit: DistanceUnit = "imperial",
): Set<ThermometerDistanceOptionKey> {
  const helpers = thermometerPresetHelpersForUnit(unit);
  const used = helpers.usedOptionsFromAnnotations(annotations, exceptAnnotationId);
  for (const id of helpers.usedOptionsFromPending(pendingQuestions, exceptQuestionId)) {
    used.add(id);
  }
  return used;
}

export function firstAvailableThermometerDistanceMeters(
  usedOptions: ReadonlySet<ThermometerDistanceOptionKey>,
  unit: DistanceUnit = "imperial",
): number | null {
  if (unit === "metric") {
    for (const preset of METRIC_THERMOMETER_PRESET_METERS) {
      if (!usedOptions.has(preset)) {
        return preset;
      }
    }
    return null;
  }

  const miles = thermometerPresetHelpersForUnit(unit).firstUnusedFromPresets(
    THERMOMETER_DISTANCE_PRESETS_MILES,
    usedOptions,
  );
  return miles === null ? null : milesToMeters(miles);
}

export function firstAvailableThermometerDistanceMetersForSession(
  session: SessionRulesInput,
  usedOptions: ReadonlySet<ThermometerDistanceOptionKey>,
): number | null {
  const unit = sessionDistanceUnit(session);
  for (const preset of availableThermometerDistancePresetsForSession(session)) {
    const key = thermometerPresetForDistance(preset, unit);
    if (key !== null && !usedOptions.has(key)) {
      return preset;
    }
  }
  return null;
}

export function isThermometerDistanceOptionUsed(
  usedOptions: ReadonlySet<ThermometerDistanceOptionKey>,
  distanceMeters: number,
  unit: DistanceUnit = "imperial",
): boolean {
  const key = thermometerPresetForDistance(distanceMeters, unit);
  return key !== null && usedOptions.has(key);
}

export function isThermometerDistanceOptionAvailable(
  gameSizeOrUsedOptions: GameSize | ReadonlySet<ThermometerDistanceOptionKey>,
  distanceMeters: number,
  unit: DistanceUnit = "imperial",
): boolean {
  if (typeof gameSizeOrUsedOptions === "string") {
    return availableThermometerDistancePresets(gameSizeOrUsedOptions).some(
      (preset) => Math.abs(preset - distanceMeters) < THERMOMETER_PRESET_MATCH_TOLERANCE_METERS,
    );
  }

  const key = thermometerPresetForDistance(distanceMeters, unit);
  return thermometerPresetHelpersForUnit(unit).isOptionAvailable(key, gameSizeOrUsedOptions);
}

export function availableThermometerDistancePresets(
  gameSizeOrUsedOptions: GameSize | ReadonlySet<ThermometerDistanceOptionKey>,
  unit: DistanceUnit = "imperial",
): number[] {
  if (typeof gameSizeOrUsedOptions === "string") {
    return thermometerPresetsMetersForGameSize(gameSizeOrUsedOptions, unit);
  }

  const ladder =
    unit === "metric" ? [...METRIC_THERMOMETER_PRESET_METERS] : THERMOMETER_DISTANCE_PRESETS;
  return ladder.filter((presetMeters) => {
    const key = thermometerPresetForDistance(presetMeters, unit);
    return key !== null && !gameSizeOrUsedOptions.has(key);
  });
}

export function availableThermometerDistancePresetsForSession(
  session: SessionRulesInput,
): number[] {
  return resolveThermometerPresetsMeters(session);
}

export function isThermometerDistanceOptionAvailableForSession(
  session: SessionRulesInput,
  distanceMeters: number,
): boolean {
  return resolveIsThermometerPresetAvailable(session, distanceMeters);
}

export function thermometerDistanceLabel(
  distanceMeters: number,
  unit: DistanceUnit = "imperial",
): string {
  if (unit === "imperial") {
    const miles = distanceMeters / 1609.344;
    if (Math.abs(miles - 0.5) < 0.01) {
      return "1/2 mile";
    }

    if (Number.isInteger(miles)) {
      return `${miles} miles`;
    }

    return formatPresetDistance(distanceMeters, unit);
  }

  return formatPresetDistance(distanceMeters, unit);
}

export function thermometerQuestionPrompt(
  distanceMeters: number,
  unit: DistanceUnit = "imperial",
): string {
  return `After traveling ${thermometerDistanceLabel(distanceMeters, unit)}, am I hotter or colder?`;
}

export function thermometerUseCount(
  annotations: readonly AnnotationRecord[],
  distanceMeters: number,
  exceptAnnotationId?: string,
  unit: DistanceUnit = "imperial",
): number {
  const target = thermometerPresetForDistance(distanceMeters, unit);
  if (target === null) {
    return 0;
  }

  return thermometerPresetHelpersForUnit(unit).optionUseCountFromAnnotations(
    annotations,
    target,
    exceptAnnotationId,
  );
}

export function thermometerUseCountFromPending(
  pendingQuestions: readonly PendingQuestionRecord[],
  distanceMeters: number,
  exceptQuestionId?: string,
  unit: DistanceUnit = "imperial",
): number {
  const target = thermometerPresetForDistance(distanceMeters, unit);
  if (target === null) {
    return 0;
  }

  return thermometerPresetHelpersForUnit(unit).optionUseCountFromPending(
    pendingQuestions,
    target,
    exceptQuestionId,
  );
}

export function thermometerShadedSide(
  answer: ThermometerAnswer | null | undefined,
): "hot" | "cold" {
  return answer === "colder" ? "hot" : "cold";
}

export function thermometerHotterTowards(answer: ThermometerAnswer): "a" | "b" {
  return answer === "hotter" ? "b" : "a";
}
