import type { AnnotationRecord } from "../map/annotations";
import type { PendingQuestionRecord } from "../session/sessionChat";
import type { GameSize } from "../session/gameSize";
import { presetMetersForMiles } from "../session/toolSessionOptions";
import {
  formatDistance,
  MILE_RADIUS_PRESETS,
  milesToMeters,
  type DistanceUnit,
} from "../map/distance";
import {
  isRadarCustomRadiusWithinGameSizeLimit,
  isRadarPresetMetersForGameSize,
  matchPresetMeters,
  maxRadarPresetMetersForGameSize,
  METRIC_RADAR_PRESET_METERS,
  radarPresetsMetersForGameSizeAndUnit,
  UI_PRESET_MATCH_TOLERANCE_METERS,
} from "../map/distancePresets";
import { buildPresetCatalogHelpers } from "./distancePresets";

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

export function radarOptionKeyForPresetMeters(
  presetMeters: number,
  unit: DistanceUnit,
): RadarDistanceOptionKey {
  if (unit === "metric") {
    return presetMeters as RadarDistanceOptionKey;
  }

  return (presetMeters / milesToMeters(1)) as RadarDistanceOptionKey;
}

export function radarPresetForRadius(
  radiusMeters: number,
  unit: DistanceUnit,
): RadarDistanceOptionKey | null {
  if (unit === "metric") {
    const preset = matchPresetMeters(
      radiusMeters,
      METRIC_RADAR_PRESET_METERS,
      UI_PRESET_MATCH_TOLERANCE_METERS,
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
    UI_PRESET_MATCH_TOLERANCE_METERS,
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

function radarPresetHelpersForUnit(unit: DistanceUnit) {
  return buildPresetCatalogHelpers<RadarDistanceOptionKey>({
    toolType: "radar",
    readOptionFromAnnotation: (annotation) =>
      radarDistanceOptionForAnnotation(annotation, unit),
    readOptionFromPending: (question) =>
      radarDistanceOptionForPending(question, unit),
  });
}

export function usedRadarDistanceOptions(
  annotations: AnnotationRecord[],
  unit: DistanceUnit = "imperial",
  exceptAnnotationId?: string,
): Set<RadarDistanceOptionKey> {
  return radarPresetHelpersForUnit(unit).usedOptionsFromAnnotations(
    annotations,
    exceptAnnotationId,
  );
}

export function isRadarRadiusAllowedForGameSize(
  gameSize: GameSize,
  distanceMeters: number,
  unit: DistanceUnit,
  chooseCustom: boolean,
): boolean {
  if (chooseCustom) {
    return isRadarCustomRadiusWithinGameSizeLimit(
      gameSize,
      distanceMeters,
      unit,
    );
  }

  return isRadarPresetMetersForGameSize(gameSize, distanceMeters, unit);
}

export function isRadarDistanceOptionUsed(
  usedOptions: ReadonlySet<RadarDistanceOptionKey>,
  chooseCustom: boolean,
  radiusMeters: number,
  unit: DistanceUnit,
): boolean {
  if (chooseCustom) {
    return usedOptions.has("choose");
  }

  const optionKey = radarPresetForRadius(radiusMeters, unit);
  return optionKey !== null && usedOptions.has(optionKey);
}

export function firstAvailableRadarDistanceSelection(
  usedOptions: ReadonlySet<RadarDistanceOptionKey>,
  unit: DistanceUnit = "imperial",
  gameSize: GameSize = "medium",
): { chooseCustom: boolean; radiusMeters: number } | null {
  const presets = radarPresetsMetersForGameSizeAndUnit(gameSize, unit);
  for (const preset of presets) {
    const optionKey = radarOptionKeyForPresetMeters(preset, unit);
    if (!usedOptions.has(optionKey)) {
      return { chooseCustom: false, radiusMeters: preset };
    }
  }

  if (!usedOptions.has("choose")) {
    return {
      chooseCustom: true,
      radiusMeters: presets[0] ?? (unit === "metric" ? 1000 : milesToMeters(1)),
    };
  }

  return null;
}

export function availableRadarDistancePresets(
  gameSize: GameSize,
  unit: DistanceUnit,
  usedOptions: ReadonlySet<RadarDistanceOptionKey>,
): number[] {
  return radarPresetsMetersForGameSizeAndUnit(gameSize, unit).filter((preset) => {
    const optionKey = radarOptionKeyForPresetMeters(preset, unit);
    return !usedOptions.has(optionKey);
  });
}

export function maxRadarCustomRadiusMeters(
  gameSize: GameSize,
  unit: DistanceUnit,
): number {
  return maxRadarPresetMetersForGameSize(gameSize, unit);
}

export function radarDistanceUseCount(
  annotations: readonly AnnotationRecord[],
  chooseCustom: boolean,
  radiusMeters: number,
  unit: DistanceUnit = "imperial",
  exceptAnnotationId?: string,
): number {
  const targetKey = chooseCustom
    ? "choose"
    : radarPresetForRadius(radiusMeters, unit);
  if (targetKey === null) {
    return 0;
  }

  return radarPresetHelpersForUnit(unit).optionUseCountFromAnnotations(
    annotations,
    targetKey,
    exceptAnnotationId,
  );
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
  if (targetKey === null) {
    return 0;
  }

  return radarPresetHelpersForUnit(unit).optionUseCountFromPending(
    pendingQuestions,
    targetKey,
    exceptQuestionId,
  );
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
