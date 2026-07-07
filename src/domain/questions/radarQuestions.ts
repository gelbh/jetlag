import type { AnnotationRecord } from "../map/annotations";
import type { PendingQuestionRecord } from "../session/sessionChat";
import { isCountablePendingQuestionStatus } from "./questionRules";
import {
  collectUsedAnnotationOptions,
  firstUnusedPreset,
  presetMetersForMiles,
} from "../session/toolSessionOptions";
import {
  formatDistance,
  MILE_RADIUS_PRESETS,
  milesToMeters,
  type DistanceUnit,
} from "../map/distance";
import {
  matchPresetMeters,
  METRIC_RADAR_PRESET_METERS,
} from "../map/distancePresets";

export const RADAR_DISTANCE_MILES = MILE_RADIUS_PRESETS;

export const RADAR_RADIUS_PRESET_METERS =
  RADAR_DISTANCE_MILES.map(milesToMeters);

export const RADAR_CHOOSE_LABEL = "CHOOSE";

export type RadarAnswer = "yes" | "no";

export type RadarDistanceOptionKey =
  | (typeof RADAR_DISTANCE_MILES)[number]
  | (typeof METRIC_RADAR_PRESET_METERS)[number]
  | "choose";

const RADAR_PROMPT_TEMPLATE = "Are you within [DISTANCE] of me?";
const RADAR_PRESET_MATCH_TOLERANCE_METERS = 1;

export function radarPresetForRadius(
  radiusMeters: number,
  unit: DistanceUnit,
): RadarDistanceOptionKey | null {
  if (unit === "metric") {
    const preset = matchPresetMeters(
      radiusMeters,
      METRIC_RADAR_PRESET_METERS,
      RADAR_PRESET_MATCH_TOLERANCE_METERS,
    );
    return preset as RadarDistanceOptionKey | null;
  }

  return radarPresetMilesForRadius(radiusMeters);
}

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
  unit: DistanceUnit = "imperial",
): RadarDistanceOptionKey | null {
  if (annotation.type !== "radar") {
    return null;
  }

  const radiusMeters = annotation.metadata.radiusMeters ?? milesToMeters(1);
  if (annotation.metadata.radarChooseCustom === true) {
    return "choose";
  }

  const preset = radarPresetForRadius(radiusMeters, unit);
  if (annotation.metadata.radarChooseCustom === false) {
    return preset ?? "choose";
  }

  return preset ?? "choose";
}

export function radarDistanceOptionForPending(
  question: PendingQuestionRecord,
  unit: DistanceUnit = "imperial",
): RadarDistanceOptionKey | null {
  if (question.toolType !== "radar") {
    return null;
  }

  const metadata = question.placement.metadata;
  const radiusMeters =
    typeof metadata.radiusMeters === "number"
      ? metadata.radiusMeters
      : milesToMeters(1);
  if (metadata.radarChooseCustom === true) {
    return "choose";
  }

  const preset = radarPresetForRadius(radiusMeters, unit);
  if (metadata.radarChooseCustom === false) {
    return preset ?? "choose";
  }

  return preset ?? "choose";
}

export function usedRadarDistanceOptions(
  annotations: AnnotationRecord[],
  unit: DistanceUnit = "imperial",
  exceptAnnotationId?: string,
): Set<RadarDistanceOptionKey> {
  return collectUsedAnnotationOptions(
    annotations,
    (annotation) => radarDistanceOptionForAnnotation(annotation, unit),
    exceptAnnotationId,
  );
}

export function firstAvailableRadarDistanceSelection(
  usedOptions: ReadonlySet<RadarDistanceOptionKey>,
  unit: DistanceUnit = "imperial",
): { chooseCustom: boolean; radiusMeters: number } | null {
  if (unit === "metric") {
    for (const preset of METRIC_RADAR_PRESET_METERS) {
      if (!usedOptions.has(preset)) {
        return { chooseCustom: false, radiusMeters: preset };
      }
    }
  } else {
    const presetMiles = firstUnusedPreset(RADAR_DISTANCE_MILES, usedOptions);
    if (presetMiles !== null) {
      return {
        chooseCustom: false,
        radiusMeters: milesToMeters(Number(presetMiles)),
      };
    }
  }

  if (!usedOptions.has("choose")) {
    return {
      chooseCustom: true,
      radiusMeters: unit === "metric" ? 1000 : milesToMeters(1),
    };
  }

  return null;
}

export function isRadarDistanceOptionAvailable(): boolean {
  return true;
}

export function radarDistanceUseCount(
  annotations: readonly AnnotationRecord[],
  chooseCustom: boolean,
  radiusMeters: number,
  unit: DistanceUnit = "imperial",
  exceptAnnotationId?: string,
): number {
  let count = 0;
  for (const annotation of annotations) {
    if (annotation.status !== "active" || annotation.type !== "radar") {
      continue;
    }
    if (exceptAnnotationId && annotation.id === exceptAnnotationId) {
      continue;
    }
    const optionKey = radarDistanceOptionForAnnotation(annotation, unit);
    const targetKey = chooseCustom
      ? "choose"
      : radarPresetForRadius(radiusMeters, unit);
    if (optionKey === targetKey) {
      count += 1;
    }
  }
  return count;
}

export function radarDistanceUseCountFromPending(
  pendingQuestions: readonly PendingQuestionRecord[],
  chooseCustom: boolean,
  radiusMeters: number,
  unit: DistanceUnit = "imperial",
  exceptQuestionId?: string,
): number {
  const targetKey = chooseCustom
    ? "choose"
    : radarPresetForRadius(radiusMeters, unit);
  let count = 0;
  for (const question of pendingQuestions) {
    if (question.toolType !== "radar") {
      continue;
    }
    if (exceptQuestionId && question.id === exceptQuestionId) {
      continue;
    }
    if (!isCountablePendingQuestionStatus(question.status)) {
      continue;
    }
    if (radarDistanceOptionForPending(question, unit) === targetKey) {
      count += 1;
    }
  }
  return count;
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
