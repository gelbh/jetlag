import type { AnnotationType, SessionRecord } from "./annotations";
import type { MapTool } from "./mapToolTypes";
import type { DistanceUnit } from "./distance";
import { milesToMeters } from "./distance";
import {
  PRESET_MATCH_TOLERANCE_METERS,
  tentacleRadiusPresetMeters,
} from "./distancePresets";
import type { GameSize } from "./gameSize";
import {
  effectiveHidingZoneRadiusMeters,
  hidingZoneRadiusMeters,
} from "./gameSize";
import { sessionDistanceUnit } from "./sessionDistanceUnit";
import {
  answerDeadlineMs,
  hidingPeriodMinutes,
  hidingPeriodMs,
  isThermometerPresetAvailableForGameSize,
  tentacleEnabledForGameSize,
  tentacleOptionsForGameSize,
  tentacleRadiusMeters,
  thermometerPresetsMilesForGameSize,
  thermometerPresetsMetersForGameSize,
  toolDockEnabled,
  gameSizeRulesSummary,
  type TentacleGameSizeCategoryId,
  type TentacleOptionForGameSize,
} from "./gameSizeRules";
import type { ThermometerDistanceOptionMiles } from "./thermometerQuestions";

export const HIDING_PERIOD_MINUTES_MIN = 5;
export const HIDING_PERIOD_MINUTES_MAX = 360;
export const PHOTO_ANSWER_DEADLINE_MINUTES_MIN = 5;
export const PHOTO_ANSWER_DEADLINE_MINUTES_MAX = 60;
export const QUESTION_ANSWER_DEADLINE_MINUTES_MIN = 2;
export const QUESTION_ANSWER_DEADLINE_MINUTES_MAX = 30;
export const TENTACLE_RADIUS_METERS_MIN = 200;
export const TENTACLE_RADIUS_METERS_MAX = 50_000;

export const HIDING_PERIOD_PRESET_MINUTES = [15, 30, 60, 120, 180] as const;
export const PHOTO_ANSWER_DEADLINE_PRESET_MINUTES = [10, 15, 20, 30] as const;
export const QUESTION_ANSWER_DEADLINE_PRESET_MINUTES = [5] as const;
export const TENTACLE_RADIUS_PRESET_METERS = tentacleRadiusPresetMeters("imperial");

export function tentacleRadiusPresetsForSession(
  session: SessionRulesInput,
): readonly number[] {
  return tentacleRadiusPresetMeters(sessionDistanceUnit(session));
}

export const ALL_CONFIGURABLE_TOOLS = [
  "matching",
  "measuring",
  "thermometer",
  "radar",
  "tentacle",
  "photo",
  "zone",
  "pin",
] as const satisfies readonly Exclude<MapTool, "none">[];

export type ConfigurableMapTool = (typeof ALL_CONFIGURABLE_TOOLS)[number];

export type SessionRulesInput = Pick<
  SessionRecord,
  | "gameSize"
  | "distanceUnit"
  | "hidingZoneRadiusMeters"
  | "hidingPeriodMinutes"
  | "photoAnswerDeadlineMinutes"
  | "questionAnswerDeadlineMinutes"
  | "disabledTools"
  | "tentaclesEnabled"
  | "thermometerPresetMiles"
  | "thermometerPresetMeters"
  | "tentacleMediumRadiusMeters"
  | "tentacleLargeRadiusMeters"
  | "customMatchingAreas"
  | "customCategories"
  | "customLocationPins"
>;

export function sessionGameSize(session: SessionRulesInput): GameSize {
  return session.gameSize ?? "medium";
}

export function clampHidingPeriodMinutes(minutes: number): number {
  return Math.min(
    HIDING_PERIOD_MINUTES_MAX,
    Math.max(HIDING_PERIOD_MINUTES_MIN, Math.round(minutes)),
  );
}

export function clampPhotoAnswerDeadlineMinutes(minutes: number): number {
  return Math.min(
    PHOTO_ANSWER_DEADLINE_MINUTES_MAX,
    Math.max(PHOTO_ANSWER_DEADLINE_MINUTES_MIN, Math.round(minutes)),
  );
}

export function clampQuestionAnswerDeadlineMinutes(minutes: number): number {
  return Math.min(
    QUESTION_ANSWER_DEADLINE_MINUTES_MAX,
    Math.max(QUESTION_ANSWER_DEADLINE_MINUTES_MIN, Math.round(minutes)),
  );
}

export function clampTentacleRadiusMeters(radiusMeters: number): number {
  return Math.min(
    TENTACLE_RADIUS_METERS_MAX,
    Math.max(TENTACLE_RADIUS_METERS_MIN, Math.round(radiusMeters)),
  );
}

export function resolveHidingPeriodMinutes(session: SessionRulesInput): number {
  if (typeof session.hidingPeriodMinutes === "number") {
    return clampHidingPeriodMinutes(session.hidingPeriodMinutes);
  }

  return hidingPeriodMinutes(sessionGameSize(session));
}

export function resolveHidingPeriodMs(session: SessionRulesInput): number {
  return resolveHidingPeriodMinutes(session) * 60 * 1000;
}

export function resolvePhotoAnswerDeadlineMinutes(
  session: SessionRulesInput,
): number {
  if (typeof session.photoAnswerDeadlineMinutes === "number") {
    return clampPhotoAnswerDeadlineMinutes(session.photoAnswerDeadlineMinutes);
  }

  return answerDeadlineMs("photo", sessionGameSize(session)) / (60 * 1000);
}

export function resolveQuestionAnswerDeadlineMinutes(
  session: SessionRulesInput,
): number {
  if (typeof session.questionAnswerDeadlineMinutes === "number") {
    return clampQuestionAnswerDeadlineMinutes(
      session.questionAnswerDeadlineMinutes,
    );
  }

  return answerDeadlineMs("matching", sessionGameSize(session)) / (60 * 1000);
}

export function resolveAnswerDeadlineMs(
  session: SessionRulesInput,
  toolType: AnnotationType | "photo",
): number {
  if (toolType === "photo") {
    return resolvePhotoAnswerDeadlineMinutes(session) * 60 * 1000;
  }

  return resolveQuestionAnswerDeadlineMinutes(session) * 60 * 1000;
}

export function resolveHidingZoneRadiusMeters(
  session: SessionRulesInput,
): number {
  return effectiveHidingZoneRadiusMeters({
    gameSize: sessionGameSize(session),
    hidingZoneRadiusMeters: session.hidingZoneRadiusMeters,
    distanceUnit: sessionDistanceUnit(session),
  });
}

export function resolveTentaclesEnabledForSession(
  session: SessionRulesInput,
): boolean {
  const gameSize = sessionGameSize(session);

  if (session.tentaclesEnabled === true) {
    return true;
  }

  if (session.tentaclesEnabled === false) {
    return false;
  }

  return tentacleEnabledForGameSize(gameSize);
}

function resolveTentacleRadiusForCategory(
  session: SessionRulesInput,
  categoryId: TentacleGameSizeCategoryId,
): number {
  const gameSize = sessionGameSize(session);
  const isLargeCategory =
    gameSize === "large" &&
    (["metro_line", "zoo", "aquarium", "amusement_park"] as readonly string[]).includes(
      categoryId,
    );

  if (isLargeCategory && typeof session.tentacleLargeRadiusMeters === "number") {
    return clampTentacleRadiusMeters(session.tentacleLargeRadiusMeters);
  }

  if (!isLargeCategory && typeof session.tentacleMediumRadiusMeters === "number") {
    return clampTentacleRadiusMeters(session.tentacleMediumRadiusMeters);
  }

  return tentacleRadiusMeters(
    categoryId,
    gameSize,
    sessionDistanceUnit(session),
  );
}

export function resolveTentacleOptions(
  session: SessionRulesInput,
): readonly TentacleOptionForGameSize[] {
  if (!resolveTentaclesEnabledForSession(session)) {
    return [];
  }

  const gameSize = sessionGameSize(session);
  const defaults = tentacleOptionsForGameSize(
    gameSize,
    sessionDistanceUnit(session),
  );

  if (defaults.length === 0 && session.tentaclesEnabled === true) {
    const mediumCategories = [
      "museum",
      "library",
      "movie_theater",
      "hospital",
    ] as const satisfies readonly TentacleGameSizeCategoryId[];

    const medium = mediumCategories.map((categoryId) => ({
      categoryId,
      radiusMeters: resolveTentacleRadiusForCategory(session, categoryId),
    }));

    if (gameSize !== "large") {
      return medium;
    }

    const largeCategories = [
      "metro_line",
      "zoo",
      "aquarium",
      "amusement_park",
    ] as const satisfies readonly TentacleGameSizeCategoryId[];

    const large = largeCategories.map((categoryId) => ({
      categoryId,
      radiusMeters: resolveTentacleRadiusForCategory(session, categoryId),
    }));

    return [...medium, ...large];
  }

  return defaults.map((option) => ({
    categoryId: option.categoryId,
    radiusMeters: resolveTentacleRadiusForCategory(session, option.categoryId),
  }));
}

export function resolveThermometerPresetsMiles(
  session: SessionRulesInput,
): readonly ThermometerDistanceOptionMiles[] {
  const gameSize = sessionGameSize(session);
  const defaults = thermometerPresetsMilesForGameSize(gameSize);

  if (!session.thermometerPresetMiles?.length) {
    return defaults;
  }

  const allowed = new Set(defaults);
  const selected = session.thermometerPresetMiles.filter(
    (miles): miles is ThermometerDistanceOptionMiles =>
      allowed.has(miles as ThermometerDistanceOptionMiles),
  );

  return selected.length > 0 ? selected : defaults;
}

export function resolveThermometerPresetsMeters(
  session: SessionRulesInput,
): number[] {
  const gameSize = sessionGameSize(session);
  const unit = sessionDistanceUnit(session);
  const defaults = thermometerPresetsMetersForGameSize(gameSize, unit);

  if (session.thermometerPresetMeters?.length) {
    const allowed = new Set(defaults);
    const selected = session.thermometerPresetMeters.filter((meters) =>
      [...allowed].some(
        (preset) => Math.abs(preset - meters) < PRESET_MATCH_TOLERANCE_METERS,
      ),
    );
    return selected.length > 0 ? selected : defaults;
  }

  if (session.thermometerPresetMiles?.length) {
    const allowed = new Set(defaults);
    const selected = session.thermometerPresetMiles
      .map(milesToMeters)
      .filter((meters) =>
        [...allowed].some(
          (preset) =>
            Math.abs(preset - meters) < PRESET_MATCH_TOLERANCE_METERS,
        ),
      );
    return selected.length > 0 ? selected : defaults;
  }

  return defaults;
}

export function resolveIsThermometerPresetAvailable(
  session: SessionRulesInput,
  distanceMeters: number,
): boolean {
  return resolveThermometerPresetsMeters(session).some(
    (preset) =>
      Math.abs(preset - distanceMeters) < PRESET_MATCH_TOLERANCE_METERS,
  );
}

export function resolveToolDockEnabled(
  session: SessionRulesInput,
  toolId: Exclude<MapTool, "none">,
  options?: { hasHiders?: boolean },
): boolean {
  if (session.disabledTools?.includes(toolId)) {
    return false;
  }

  if (toolId === "tentacle") {
    return resolveTentaclesEnabledForSession(session);
  }

  return toolDockEnabled(toolId, sessionGameSize(session), options);
}

export function isConfigurableMapTool(
  toolId: string,
): toolId is ConfigurableMapTool {
  return (ALL_CONFIGURABLE_TOOLS as readonly string[]).includes(toolId);
}

export function parseDisabledTools(value: unknown): ConfigurableMapTool[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const tools = value.filter(isConfigurableMapTool);
  return tools.length > 0 ? tools : undefined;
}

export function parseThermometerPresetMeters(
  value: unknown,
): number[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const presets = value.filter(
    (item): item is number => typeof item === "number" && item > 0,
  );

  return presets.length > 0 ? presets : undefined;
}

export function parseThermometerPresetMiles(
  value: unknown,
): ThermometerDistanceOptionMiles[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const presets = value.filter(
    (item): item is ThermometerDistanceOptionMiles =>
      item === 0.5 || item === 3 || item === 10 || item === 50,
  );

  return presets.length > 0 ? presets : undefined;
}

export function parseDistanceUnit(value: unknown): DistanceUnit | undefined {
  return value === "metric" || value === "imperial" ? value : undefined;
}

/** @deprecated Use resolveIsThermometerPresetAvailable with session */
export function isThermometerPresetAvailableForSession(
  session: SessionRulesInput,
  distanceMeters: number,
): boolean {
  const gameSize = sessionGameSize(session);
  if (session.thermometerPresetMiles?.length) {
    return resolveIsThermometerPresetAvailable(session, distanceMeters);
  }

  return isThermometerPresetAvailableForGameSize(gameSize, distanceMeters);
}

export function sessionRulesSummary(session: SessionRulesInput): {
  hidingPeriodLabel: string;
  hidingZoneLabel: string;
  tentacleLabel: string;
  thermometerMaxLabel: string;
} {
  const hidingMinutes = resolveHidingPeriodMinutes(session);
  const hidingHours = hidingMinutes / 60;
  const hidingPeriodLabel =
    hidingMinutes < 60
      ? `${hidingMinutes} min hiding period`
      : `${hidingHours} hr hiding period`;

  const base = gameSizeRulesSummary(
    sessionGameSize(session),
    sessionDistanceUnit(session),
  );

  const radiusMeters = resolveHidingZoneRadiusMeters(session);
  const defaultRadius = hidingZoneRadiusMeters(
    sessionGameSize(session),
    sessionDistanceUnit(session),
  );
  const hidingZoneLabel =
    Math.abs(radiusMeters - defaultRadius) < PRESET_MATCH_TOLERANCE_METERS
      ? base.hidingZoneLabel
      : `${Math.round(radiusMeters)} m hiding zones`;

  const tentacleEnabled = resolveTentaclesEnabledForSession(session);
  const tentacleLabel = tentacleEnabled ? base.tentacleLabel : "No tentacles";

  return {
    hidingPeriodLabel,
    hidingZoneLabel,
    tentacleLabel,
    thermometerMaxLabel: base.thermometerMaxLabel,
  };
}

export function timerNeverStarted(session: SessionRecord): boolean {
  return (
    (session.timerAccumulatedMs ?? 0) === 0 &&
    (session.timerRunningSince === null || session.timerRunningSince === undefined)
  );
}

/** Legacy helper for callers that only have gameSize */
export { hidingPeriodMs };
