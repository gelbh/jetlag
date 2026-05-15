import {
  formatPresetDistance,
  milesToMeters,
  type DistanceUnit,
} from "./distance";
import type { AnnotationRecord } from "./annotations";
import {
  collectUsedAnnotationOptions,
  firstUnusedPreset,
  isPresetOptionAvailable,
  presetMetersForMiles,
} from "./toolSessionOptions";

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
  return presetMetersForMiles(
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

export function usedThermometerDistanceOptions(
  annotations: AnnotationRecord[],
  exceptAnnotationId?: string,
): Set<ThermometerDistanceOptionMiles> {
  return collectUsedAnnotationOptions(
    annotations,
    (annotation) => thermometerDistanceOptionForAnnotation(annotation),
    exceptAnnotationId,
  );
}

export function firstAvailableThermometerDistanceMeters(
  usedOptions: ReadonlySet<ThermometerDistanceOptionMiles>,
): number | null {
  const miles = firstUnusedPreset(
    THERMOMETER_DISTANCE_PRESETS_MILES,
    usedOptions,
  );
  return miles === null ? null : milesToMeters(miles);
}

export function isThermometerDistanceOptionAvailable(
  usedOptions: ReadonlySet<ThermometerDistanceOptionMiles>,
  distanceMeters: number,
): boolean {
  const presetMiles = thermometerPresetMilesForMeters(distanceMeters);
  return isPresetOptionAvailable(presetMiles, usedOptions);
}

export function availableThermometerDistancePresets(
  usedOptions: ReadonlySet<ThermometerDistanceOptionMiles>,
): number[] {
  return THERMOMETER_DISTANCE_PRESETS.filter((presetMeters) => {
    const presetMiles = thermometerPresetMilesForMeters(presetMeters);
    return presetMiles !== null && !usedOptions.has(presetMiles);
  });
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
  return `I've just traveled (at least) ${thermometerDistanceLabel(distanceMeters, unit)}. Am I hotter or colder?`;
}

export function thermometerShadedSide(
  answer: ThermometerAnswer | null | undefined,
): "hot" | "cold" {
  return answer === "colder" ? "hot" : "cold";
}

export function thermometerHotterTowards(answer: ThermometerAnswer): "a" | "b" {
  return answer === "hotter" ? "b" : "a";
}
