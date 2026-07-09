import type { DistanceUnit } from "../map/distance";
import type { SessionRecord } from "../map/annotations";
import type { GameSize } from "./gameSize";
import {
  clampHidingZoneRadiusMeters,
  hidingZoneRadiusMeters,
} from "./gameSize";
import {
  answerDeadlineMs,
  hidingPeriodMinutes,
  tentacleRadiusMeters,
  thermometerPresetsMetersForGameSize,
  thermometerPresetsMilesForGameSize,
} from "./gameSizeRules";
import { sessionDistanceUnit } from "./sessionDistanceUnit";
import { resolveDistanceUnit } from "../map/distancePresets";
import type { ThermometerDistanceOptionMiles } from "../questions/thermometerQuestions";
import type {
  CustomMatchingAreasByLevel,
  SessionCustomCategory,
  SessionCustomLocationPin,
} from "./sessionCustomContent";
import type { SessionCustomMeasureGeometry } from "./customMeasureGeometry";
import {
  ALL_CONFIGURABLE_TOOLS,
  clampHidingPeriodMinutes,
  clampPhotoAnswerDeadlineMinutes,
  clampQuestionAnswerDeadlineMinutes,
  clampTentacleRadiusMeters,
  type ConfigurableMapTool,
} from "./sessionRules";

export interface AdvancedSessionSettingsValue {
  customHidingZoneRadiusEnabled: boolean;
  hidingZoneRadiusMeters: number;
  customHidingPeriodEnabled: boolean;
  hidingPeriodMinutes: number;
  customPhotoAnswerDeadlineEnabled: boolean;
  photoAnswerDeadlineMinutes: number;
  customQuestionAnswerDeadlineEnabled: boolean;
  questionAnswerDeadlineMinutes: number;
  disabledTools: readonly ConfigurableMapTool[];
  tentaclesEnabledOverride: boolean;
  customThermometerPresetsEnabled: boolean;
  thermometerPresetMiles: readonly ThermometerDistanceOptionMiles[];
  thermometerPresetMeters: readonly number[];
  customTentacleMediumRadiusEnabled: boolean;
  tentacleMediumRadiusMeters: number;
  customTentacleLargeRadiusEnabled: boolean;
  tentacleLargeRadiusMeters: number;
  customMatchingAreas: CustomMatchingAreasByLevel;
  customCategories: readonly SessionCustomCategory[];
  customLocationPins: readonly SessionCustomLocationPin[];
  customMeasureGeometries: readonly SessionCustomMeasureGeometry[];
  expansionPackEnabled: boolean;
  customQuestionPackEnabled: boolean;
  previewQuestionBeforeSend: boolean;
}

export type SessionRulesPatch = Pick<
  SessionRecord,
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
  | "customMeasureGeometries"
  | "expansionPackEnabled"
  | "customQuestionPackEnabled"
  | "previewQuestionBeforeSend"
>;

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

export function sessionRulesPatchFromAdvancedSettings(
  gameSize: GameSize,
  settings: AdvancedSessionSettingsValue,
  unit: DistanceUnit = "imperial",
): SessionRulesPatch {
  const patch: SessionRulesPatch = {};
  const resolved = resolveDistanceUnit(unit);

  if (settings.customHidingZoneRadiusEnabled) {
    patch.hidingZoneRadiusMeters = clampHidingZoneRadiusMeters(
      settings.hidingZoneRadiusMeters,
    );
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

export function resolveAdvancedHidingZoneRadiusMeters(
  _gameSize: GameSize,
  settings: AdvancedSessionSettingsValue,
): number | undefined {
  if (!settings.customHidingZoneRadiusEnabled) {
    return undefined;
  }

  return clampHidingZoneRadiusMeters(settings.hidingZoneRadiusMeters);
}

export function isToolDisabledInSettings(
  settings: AdvancedSessionSettingsValue,
  toolId: ConfigurableMapTool,
): boolean {
  return settings.disabledTools.includes(toolId);
}

export function toggleToolInSettings(
  settings: AdvancedSessionSettingsValue,
  toolId: ConfigurableMapTool,
  enabled: boolean,
): AdvancedSessionSettingsValue {
  const disabled = new Set(settings.disabledTools);
  if (enabled) {
    disabled.delete(toolId);
  } else {
    disabled.add(toolId);
  }

  return {
    ...settings,
    disabledTools: ALL_CONFIGURABLE_TOOLS.filter((tool) => disabled.has(tool)),
  };
}

export function toggleThermometerPresetInSettings(
  settings: AdvancedSessionSettingsValue,
  presetMeters: number,
  gameSize: GameSize,
  unit: DistanceUnit = "imperial",
): AdvancedSessionSettingsValue {
  const available = thermometerPresetsMetersForGameSize(gameSize, unit);
  if (!available.some((preset) => Math.abs(preset - presetMeters) < 5)) {
    return settings;
  }

  const current = new Set(settings.thermometerPresetMeters);
  if ([...current].some((value) => Math.abs(value - presetMeters) < 5)) {
    if (current.size <= 1) {
      return settings;
    }
    const next = [...current].filter(
      (value) => Math.abs(value - presetMeters) >= 5,
    );
    return {
      ...settings,
      customThermometerPresetsEnabled: true,
      thermometerPresetMeters: next,
    };
  }

  return {
    ...settings,
    customThermometerPresetsEnabled: true,
    thermometerPresetMeters: [...current, presetMeters].sort((a, b) => a - b),
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
