import type { DistanceUnit } from "../../map/distance";
import { resolveDistanceUnit } from "../../map/distancePresets";
import type { SessionRecord } from "../../map/annotations";
import type { GameSize } from "../gameSize";
import {
  clampHidingZoneRadiusMeters,
  hidingZoneRadiusMeters,
} from "../gameSize";
import {
  answerDeadlineMs,
  hidingPeriodMinutes,
  tentacleRadiusMeters,
  thermometerPresetsMetersForGameSize,
  thermometerPresetsMilesForGameSize,
} from "../gameSizeRules";
import { sessionDistanceUnit } from "../sessionDistanceUnit";
import type { AdvancedSessionSettingsValue } from "./types";

export function defaultAdvancedSessionSettings(
  gameSize: GameSize,
  unit: DistanceUnit = "imperial",
): AdvancedSessionSettingsValue {
  const resolved = resolveDistanceUnit(unit);
  return {
    customHidingZoneRadiusEnabled: false,
    hidingZoneRadiusMeters: hidingZoneRadiusMeters(gameSize, resolved),
    customHidingPeriodEnabled: false,
    hidingPeriodMinutes: hidingPeriodMinutes(gameSize),
    customPhotoAnswerDeadlineEnabled: false,
    photoAnswerDeadlineMinutes:
      answerDeadlineMs("photo", gameSize) / (60 * 1000),
    customQuestionAnswerDeadlineEnabled: false,
    questionAnswerDeadlineMinutes:
      answerDeadlineMs("matching", gameSize) / (60 * 1000),
    disabledTools: [],
    tentaclesEnabledOverride: false,
    customThermometerPresetsEnabled: false,
    thermometerPresetMiles: thermometerPresetsMilesForGameSize(gameSize),
    thermometerPresetMeters: thermometerPresetsMetersForGameSize(
      gameSize,
      resolved,
    ),
    customTentacleMediumRadiusEnabled: false,
    tentacleMediumRadiusMeters: tentacleRadiusMeters(
      "museum",
      gameSize,
      resolved,
    ),
    customTentacleLargeRadiusEnabled: false,
    tentacleLargeRadiusMeters: tentacleRadiusMeters(
      "metro_line",
      "large",
      resolved,
    ),
    customMatchingAreas: {},
    customCategories: [],
    customLocationPins: [],
    customMeasureGeometries: [],
    expansionPackEnabled: false,
    customQuestionPackEnabled: false,
    previewQuestionBeforeSend: false,
  };
}

export function advancedSettingsFromSession(
  session: SessionRecord,
): AdvancedSessionSettingsValue {
  const gameSize = session.gameSize ?? "medium";
  const unit = sessionDistanceUnit(session);
  const defaults = defaultAdvancedSessionSettings(gameSize, unit);
  const defaultRadius = hidingZoneRadiusMeters(gameSize, unit);
  const hasCustomRadius =
    typeof session.hidingZoneRadiusMeters === "number" &&
    Math.abs(session.hidingZoneRadiusMeters - defaultRadius) >= 1;

  const availableThermoMeters = thermometerPresetsMetersForGameSize(
    gameSize,
    unit,
  );
  const sessionThermoMeters = session.thermometerPresetMeters?.filter(
    (meters) =>
      availableThermoMeters.some((preset) => Math.abs(preset - meters) < 5),
  );

  return {
    customHidingZoneRadiusEnabled: hasCustomRadius,
    hidingZoneRadiusMeters: session.hidingZoneRadiusMeters ?? defaultRadius,
    customHidingPeriodEnabled:
      typeof session.hidingPeriodMinutes === "number",
    hidingPeriodMinutes:
      session.hidingPeriodMinutes ?? defaults.hidingPeriodMinutes,
    customPhotoAnswerDeadlineEnabled:
      typeof session.photoAnswerDeadlineMinutes === "number",
    photoAnswerDeadlineMinutes:
      session.photoAnswerDeadlineMinutes ??
      defaults.photoAnswerDeadlineMinutes,
    customQuestionAnswerDeadlineEnabled:
      typeof session.questionAnswerDeadlineMinutes === "number",
    questionAnswerDeadlineMinutes:
      session.questionAnswerDeadlineMinutes ??
      defaults.questionAnswerDeadlineMinutes,
    disabledTools: session.disabledTools ?? [],
    tentaclesEnabledOverride: session.tentaclesEnabled === true,
    customThermometerPresetsEnabled: (sessionThermoMeters?.length ?? 0) > 0,
    thermometerPresetMiles: defaults.thermometerPresetMiles,
    thermometerPresetMeters:
      sessionThermoMeters?.length
        ? sessionThermoMeters
        : defaults.thermometerPresetMeters,
    customTentacleMediumRadiusEnabled:
      typeof session.tentacleMediumRadiusMeters === "number",
    tentacleMediumRadiusMeters:
      session.tentacleMediumRadiusMeters ?? defaults.tentacleMediumRadiusMeters,
    customTentacleLargeRadiusEnabled:
      typeof session.tentacleLargeRadiusMeters === "number",
    tentacleLargeRadiusMeters:
      session.tentacleLargeRadiusMeters ?? defaults.tentacleLargeRadiusMeters,
    customMatchingAreas: session.customMatchingAreas ?? {},
    customCategories: session.customCategories ?? [],
    customLocationPins: session.customLocationPins ?? [],
    customMeasureGeometries: session.customMeasureGeometries ?? [],
    expansionPackEnabled: session.expansionPackEnabled === true,
    customQuestionPackEnabled: session.customQuestionPackEnabled === true,
    previewQuestionBeforeSend: session.previewQuestionBeforeSend === true,
  };
}

export function resolveAdvancedHidingZoneRadiusMeters(
  _gameSize: GameSize,
  settings: AdvancedSessionSettingsValue,
): number | undefined {
  if (!settings.customHidingZoneRadiusEnabled) {
    return undefined;
  }

  return clampHidingZoneRadiusMeters(settings.hidingZoneRadiusMeters);
}
