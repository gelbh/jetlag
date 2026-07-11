import {
  formatPresetDistance,
  milesToMeters,
  type DistanceUnit,
} from "../map/distance";
import type { AnnotationRecord } from "../map/annotations";
import type { PendingQuestionRecord } from "../session/sessionChat";
import type { GameSize } from "../session/gameSize";
import { thermometerPresetsMetersForGameSize } from "../session/gameSizeRules";
import {
  resolveIsThermometerPresetAvailable,
  resolveThermometerPresetsMeters,
  type SessionRulesInput,
} from "../session/sessionRules";
import {
  buildPresetCatalogHelpers,
  presetMilesForDistanceMeters,
} from "./distancePresets";

export type ThermometerAnswer = "hotter" | "colder";

export const THERMOMETER_DISTANCE_PRESETS_MILES = [0.5, 3, 10, 50] as const;

export type ThermometerDistanceOptionMiles =
  (typeof THERMOMETER_DISTANCE_PRESETS_MILES)[number];

export const THERMOMETER_DISTANCE_PRESETS =
  THERMOMETER_DISTANCE_PRESETS_MILES.map(milesToMeters);

export const DEFAULT_THERMOMETER_DISTANCE_METERS =
  THERMOMETER_DISTANCE_PRESETS[0];

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

export function thermometerDistanceOptionForAnnotation(
  annotation: AnnotationRecord,
): ThermometerDistanceOptionMiles | null {
  if (
    annotation.type !== "thermometer" ||
    annotation.metadata.thermometerDistanceMeters === undefined
  ) {
    return null;
  }

  return thermometerPresetMilesForMeters(
    annotation.metadata.thermometerDistanceMeters,
  );
}

function thermometerDistanceOptionForPending(
  question: PendingQuestionRecord,
): ThermometerDistanceOptionMiles | null {
  if (question.toolType !== "thermometer") {
    return null;
  }

  const pendingDistance = question.placement.metadata.thermometerDistanceMeters;
  if (typeof pendingDistance !== "number") {
    return null;
  }

  return thermometerPresetMilesForMeters(pendingDistance);
}

const thermometerPresetHelpers =
  buildPresetCatalogHelpers<ThermometerDistanceOptionMiles>({
    toolType: "thermometer",
    readOptionFromAnnotation: thermometerDistanceOptionForAnnotation,
    readOptionFromPending: thermometerDistanceOptionForPending,
  });

export function usedThermometerDistanceOptions(
  annotations: AnnotationRecord[],
  exceptAnnotationId?: string,
): Set<ThermometerDistanceOptionMiles> {
  return thermometerPresetHelpers.usedOptionsFromAnnotations(
    annotations,
    exceptAnnotationId,
  );
}

export function firstAvailableThermometerDistanceMeters(
  usedOptions: ReadonlySet<ThermometerDistanceOptionMiles>,
): number | null {
  const miles = thermometerPresetHelpers.firstUnusedFromPresets(
    THERMOMETER_DISTANCE_PRESETS_MILES,
    usedOptions,
  );
  return miles === null ? null : milesToMeters(miles);
}

export function isThermometerDistanceOptionAvailable(
  gameSizeOrUsedOptions: GameSize | ReadonlySet<ThermometerDistanceOptionMiles>,
  distanceMeters: number,
): boolean {
  if (typeof gameSizeOrUsedOptions === "string") {
    return availableThermometerDistancePresets(gameSizeOrUsedOptions).some(
      (preset) =>
        Math.abs(preset - distanceMeters) <
        THERMOMETER_PRESET_MATCH_TOLERANCE_METERS,
    );
  }

  const presetMiles = thermometerPresetMilesForMeters(distanceMeters);
  return thermometerPresetHelpers.isOptionAvailable(
    presetMiles,
    gameSizeOrUsedOptions,
  );
}

export function availableThermometerDistancePresets(
  gameSizeOrUsedOptions: GameSize | ReadonlySet<ThermometerDistanceOptionMiles>,
): number[] {
  if (typeof gameSizeOrUsedOptions === "string") {
    return thermometerPresetsMetersForGameSize(gameSizeOrUsedOptions);
  }

  return THERMOMETER_DISTANCE_PRESETS.filter((presetMeters) => {
    const presetMiles = thermometerPresetMilesForMeters(presetMeters);
    return presetMiles !== null && !gameSizeOrUsedOptions.has(presetMiles);
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
): number {
  const target = thermometerPresetMilesForMeters(distanceMeters);
  if (target === null) {
    return 0;
  }

  return thermometerPresetHelpers.optionUseCountFromAnnotations(
    annotations,
    target,
    exceptAnnotationId,
  );
}

export function thermometerUseCountFromPending(
  pendingQuestions: readonly PendingQuestionRecord[],
  distanceMeters: number,
  exceptQuestionId?: string,
): number {
  const target = thermometerPresetMilesForMeters(distanceMeters);
  if (target === null) {
    return 0;
  }

  return thermometerPresetHelpers.optionUseCountFromPending(
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
