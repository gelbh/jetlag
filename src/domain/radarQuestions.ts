import type { AnnotationRecord } from "./annotations";
import {
  collectUsedAnnotationOptions,
  firstUnusedPreset,
  isPresetOptionAvailable,
  presetMetersForMiles,
} from "./toolSessionOptions";
import {
  formatDistance,
  MILE_RADIUS_PRESETS,
  milesToMeters,
  type DistanceUnit,
} from "./distance";

export const RADAR_DISTANCE_MILES = MILE_RADIUS_PRESETS;

export const RADAR_RADIUS_PRESET_METERS =
  RADAR_DISTANCE_MILES.map(milesToMeters);

export const RADAR_CHOOSE_LABEL = "CHOOSE";

export type RadarAnswer = "yes" | "no";

export type RadarDistanceOptionKey =
  | (typeof RADAR_DISTANCE_MILES)[number]
  | "choose";

const RADAR_PROMPT_TEMPLATE = "Are you within [DISTANCE] of me?";
const RADAR_PRESET_MATCH_TOLERANCE_METERS = 1;

export function radarPresetMilesForRadius(
  radiusMeters: number,
): (typeof RADAR_DISTANCE_MILES)[number] | null {
  return presetMetersForMiles(
    radiusMeters,
    RADAR_DISTANCE_MILES,
    milesToMeters,
    RADAR_PRESET_MATCH_TOLERANCE_METERS,
  );
}

export function radarDistanceOptionForAnnotation(
  annotation: AnnotationRecord,
): RadarDistanceOptionKey | null {
  if (annotation.type !== "radar") {
    return null;
  }

  const radiusMeters = annotation.metadata.radiusMeters ?? milesToMeters(1);
  if (annotation.metadata.radarChooseCustom === true) {
    return "choose";
  }

  const presetMiles = radarPresetMilesForRadius(radiusMeters);
  if (annotation.metadata.radarChooseCustom === false) {
    return presetMiles ?? "choose";
  }

  return presetMiles ?? "choose";
}

export function usedRadarDistanceOptions(
  annotations: AnnotationRecord[],
  exceptAnnotationId?: string,
): Set<RadarDistanceOptionKey> {
  return collectUsedAnnotationOptions(
    annotations,
    (annotation) => radarDistanceOptionForAnnotation(annotation),
    exceptAnnotationId,
  );
}

export function firstAvailableRadarDistanceSelection(
  usedOptions: ReadonlySet<RadarDistanceOptionKey>,
): { chooseCustom: boolean; radiusMeters: number } | null {
  const presetMiles = firstUnusedPreset(RADAR_DISTANCE_MILES, usedOptions);
  if (presetMiles !== null) {
    return {
      chooseCustom: false,
      radiusMeters: milesToMeters(Number(presetMiles)),
    };
  }

  if (!usedOptions.has("choose")) {
    return { chooseCustom: true, radiusMeters: milesToMeters(1) };
  }

  return null;
}

export function isRadarDistanceOptionAvailable(
  usedOptions: ReadonlySet<RadarDistanceOptionKey>,
  chooseCustom: boolean,
  radiusMeters: number,
): boolean {
  if (chooseCustom) {
    return !usedOptions.has("choose");
  }

  const presetMiles = radarPresetMilesForRadius(radiusMeters);
  return isPresetOptionAvailable(presetMiles, usedOptions);
}

export function radarDistanceOptionLabel(
  miles: number,
  unit: DistanceUnit,
): string {
  if (unit === "imperial") {
    if (Math.abs(miles - 0.25) < 0.01) {
      return "1/4 Mile";
    }

    if (Math.abs(miles - 0.5) < 0.01) {
      return "1/2 Mile";
    }

    if (Math.abs(miles - 1) < 0.01) {
      return "1 Mile";
    }

    return `${Number.isInteger(miles) ? miles : miles.toFixed(1)} Miles`;
  }

  return formatDistance(milesToMeters(miles), unit);
}

export function radarQuestionPrompt(
  radiusMeters: number,
  unit: DistanceUnit,
): string {
  const distanceLabel = formatDistance(radiusMeters, unit);
  return RADAR_PROMPT_TEMPLATE.replace("[DISTANCE]", distanceLabel);
}

export function radarInsideFromAnswer(answer: RadarAnswer): boolean {
  return answer === "no";
}

export function radarAnswerFromInside(inside: boolean): RadarAnswer {
  return inside ? "no" : "yes";
}

export function isRadarPresetRadius(radiusMeters: number): boolean {
  return radarPresetMilesForRadius(radiusMeters) !== null;
}

export function radarAnnotationSummary(
  annotation: AnnotationRecord,
  distanceUnit: DistanceUnit = "metric",
): string {
  const radiusMeters = annotation.metadata.radiusMeters ?? milesToMeters(1);
  const prompt = radarQuestionPrompt(radiusMeters, distanceUnit);
  const inside = annotation.metadata.inside;

  if (inside === undefined) {
    return `Radar · ${prompt}`;
  }

  const answer = radarAnswerFromInside(inside);
  return `Radar · ${prompt} · ${answer}`;
}
