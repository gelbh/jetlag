import type { DistanceUnit } from "../../map/distance";
import { resolveDistanceUnit } from "../../map/distancePresets";
import type { SessionRecord } from "../../map/annotations";
import type { GameSize } from "../gameSize";
import { hidingZoneRadiusMeters } from "../gameSize";
import {
  thermometerPresetsMetersForGameSize,
} from "../gameSizeRules";
import { sessionDistanceUnit } from "../sessionDistanceUnit";
import {
  clampHidingPeriodMinutes,
  clampPhotoAnswerDeadlineMinutes,
  clampQuestionAnswerDeadlineMinutes,
  clampTentacleRadiusMeters,
} from "../sessionRules";
import type { AdvancedSessionSettingsValue, SessionRulesPatch } from "./types";

export function sessionRulesPatchFromAdvancedSettings(
  gameSize: GameSize,
  settings: AdvancedSessionSettingsValue,
  unit: DistanceUnit = "imperial",
): SessionRulesPatch {
  const patch: SessionRulesPatch = {};
  const resolved = resolveDistanceUnit(unit);

  if (settings.customHidingZoneRadiusEnabled) {
    patch.hidingZoneRadiusMeters = settings.hidingZoneRadiusMeters;
  }

  if (settings.customHidingPeriodEnabled) {
    patch.hidingPeriodMinutes = clampHidingPeriodMinutes(
      settings.hidingPeriodMinutes,
    );
  }

  if (settings.customPhotoAnswerDeadlineEnabled) {
    patch.photoAnswerDeadlineMinutes = clampPhotoAnswerDeadlineMinutes(
      settings.photoAnswerDeadlineMinutes,
    );
  }

  if (settings.customQuestionAnswerDeadlineEnabled) {
    patch.questionAnswerDeadlineMinutes = clampQuestionAnswerDeadlineMinutes(
      settings.questionAnswerDeadlineMinutes,
    );
  }

  if (settings.disabledTools.length > 0) {
    patch.disabledTools = [...settings.disabledTools];
  }

  if (settings.tentaclesEnabledOverride) {
    patch.tentaclesEnabled = true;
  }

  if (settings.customThermometerPresetsEnabled) {
    const available = thermometerPresetsMetersForGameSize(gameSize, resolved);
    const selected = settings.thermometerPresetMeters.filter((meters) =>
      available.some((preset) => Math.abs(preset - meters) < 5),
    );
    if (selected.length > 0) {
      patch.thermometerPresetMeters = selected;
    }
  }

  if (settings.customTentacleMediumRadiusEnabled) {
    patch.tentacleMediumRadiusMeters = clampTentacleRadiusMeters(
      settings.tentacleMediumRadiusMeters,
    );
  }

  if (settings.customTentacleLargeRadiusEnabled) {
    patch.tentacleLargeRadiusMeters = clampTentacleRadiusMeters(
      settings.tentacleLargeRadiusMeters,
    );
  }

  if (Object.keys(settings.customMatchingAreas).length > 0) {
    patch.customMatchingAreas = { ...settings.customMatchingAreas };
  }

  if (settings.customCategories.length > 0) {
    patch.customCategories = [...settings.customCategories];
  }

  if (settings.customLocationPins.length > 0) {
    patch.customLocationPins = [...settings.customLocationPins];
  }

  if (settings.customMeasureGeometries.length > 0) {
    patch.customMeasureGeometries = [...settings.customMeasureGeometries];
  }

  if (settings.expansionPackEnabled) {
    patch.expansionPackEnabled = true;
  }

  if (settings.customQuestionPackEnabled) {
    patch.customQuestionPackEnabled = true;
  }

  if (settings.previewQuestionBeforeSend) {
    patch.previewQuestionBeforeSend = true;
  }

  return patch;
}

export function mergeSessionRulesPatch(
  session: SessionRecord,
  patch: SessionRulesPatch,
): SessionRecord {
  const gameSize = session.gameSize ?? "medium";
  const unit = sessionDistanceUnit(session);

  return {
    ...session,
    hidingZoneRadiusMeters:
      patch.hidingZoneRadiusMeters ??
      session.hidingZoneRadiusMeters ??
      hidingZoneRadiusMeters(gameSize, unit),
    hidingPeriodMinutes:
      patch.hidingPeriodMinutes !== undefined
        ? patch.hidingPeriodMinutes
        : session.hidingPeriodMinutes,
    photoAnswerDeadlineMinutes:
      patch.photoAnswerDeadlineMinutes !== undefined
        ? patch.photoAnswerDeadlineMinutes
        : session.photoAnswerDeadlineMinutes,
    questionAnswerDeadlineMinutes:
      patch.questionAnswerDeadlineMinutes !== undefined
        ? patch.questionAnswerDeadlineMinutes
        : session.questionAnswerDeadlineMinutes,
    disabledTools:
      patch.disabledTools !== undefined
        ? patch.disabledTools
        : session.disabledTools,
    tentaclesEnabled:
      patch.tentaclesEnabled !== undefined
        ? patch.tentaclesEnabled
        : session.tentaclesEnabled,
    thermometerPresetMiles:
      patch.thermometerPresetMiles !== undefined
        ? patch.thermometerPresetMiles
        : session.thermometerPresetMiles,
    thermometerPresetMeters:
      patch.thermometerPresetMeters !== undefined
        ? patch.thermometerPresetMeters
        : session.thermometerPresetMeters,
    tentacleMediumRadiusMeters:
      patch.tentacleMediumRadiusMeters !== undefined
        ? patch.tentacleMediumRadiusMeters
        : session.tentacleMediumRadiusMeters,
    tentacleLargeRadiusMeters:
      patch.tentacleLargeRadiusMeters !== undefined
        ? patch.tentacleLargeRadiusMeters
        : session.tentacleLargeRadiusMeters,
    customMatchingAreas:
      patch.customMatchingAreas !== undefined
        ? patch.customMatchingAreas
        : session.customMatchingAreas,
    customCategories:
      patch.customCategories !== undefined
        ? patch.customCategories
        : session.customCategories,
    customLocationPins:
      patch.customLocationPins !== undefined
        ? patch.customLocationPins
        : session.customLocationPins,
    customMeasureGeometries:
      patch.customMeasureGeometries !== undefined
        ? patch.customMeasureGeometries
        : session.customMeasureGeometries,
    regionPackId:
      patch.regionPackId !== undefined
        ? patch.regionPackId
        : session.regionPackId,
    regionPackSubregionId:
      patch.regionPackSubregionId !== undefined
        ? patch.regionPackSubregionId
        : session.regionPackSubregionId,
    expansionPackEnabled:
      patch.expansionPackEnabled !== undefined
        ? patch.expansionPackEnabled
        : session.expansionPackEnabled,
    customQuestionPackEnabled:
      patch.customQuestionPackEnabled !== undefined
        ? patch.customQuestionPackEnabled
        : session.customQuestionPackEnabled,
    previewQuestionBeforeSend:
      patch.previewQuestionBeforeSend !== undefined
        ? patch.previewQuestionBeforeSend
        : session.previewQuestionBeforeSend,
  };
}

export function sessionRecordFromAdvancedSettings(
  gameSize: GameSize,
  settings: AdvancedSessionSettingsValue,
  base: Omit<
    SessionRecord,
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
    | "customMeasureGeometries"
    | "expansionPackEnabled"
    | "customQuestionPackEnabled"
    | "previewQuestionBeforeSend"
  >,
  unit: DistanceUnit = "imperial",
): SessionRecord {
  const patch = sessionRulesPatchFromAdvancedSettings(
    gameSize,
    settings,
    unit,
  );
  const merged = mergeSessionRulesPatch(
    {
      ...base,
      gameSize,
      distanceUnit: unit,
      hidingZoneRadiusMeters:
        patch.hidingZoneRadiusMeters ??
        hidingZoneRadiusMeters(gameSize, unit),
    },
    patch,
  );

  return merged;
}
