import type { SessionRecord } from "./annotations";
import type { GameSize } from "./gameSize";
import {
  clampHidingZoneRadiusMeters,
  hidingZoneRadiusMeters,
} from "./gameSize";
import {
  answerDeadlineMs,
  hidingPeriodMinutes,
  tentacleRadiusMeters,
  thermometerPresetsMilesForGameSize,
} from "./gameSizeRules";
import type { ThermometerDistanceOptionMiles } from "./thermometerQuestions";
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
  customTentacleMediumRadiusEnabled: boolean;
  tentacleMediumRadiusMeters: number;
  customTentacleLargeRadiusEnabled: boolean;
  tentacleLargeRadiusMeters: number;
}

export type SessionRulesPatch = Pick<
  SessionRecord,
  | "hidingZoneRadiusMeters"
  | "hidingPeriodMinutes"
  | "photoAnswerDeadlineMinutes"
  | "questionAnswerDeadlineMinutes"
  | "disabledTools"
  | "tentaclesEnabled"
  | "thermometerPresetMiles"
  | "tentacleMediumRadiusMeters"
  | "tentacleLargeRadiusMeters"
>;

export function defaultAdvancedSessionSettings(
  gameSize: GameSize,
): AdvancedSessionSettingsValue {
  return {
    customHidingZoneRadiusEnabled: false,
    hidingZoneRadiusMeters: hidingZoneRadiusMeters(gameSize),
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
    customTentacleMediumRadiusEnabled: false,
    tentacleMediumRadiusMeters: tentacleRadiusMeters("museum", gameSize),
    customTentacleLargeRadiusEnabled: false,
    tentacleLargeRadiusMeters: tentacleRadiusMeters("metro_line", "large"),
  };
}

export function advancedSettingsFromSession(
  session: SessionRecord,
): AdvancedSessionSettingsValue {
  const gameSize = session.gameSize ?? "medium";
  const defaults = defaultAdvancedSessionSettings(gameSize);
  const defaultRadius = hidingZoneRadiusMeters(gameSize);
  const hasCustomRadius =
    typeof session.hidingZoneRadiusMeters === "number" &&
    Math.abs(session.hidingZoneRadiusMeters - defaultRadius) >= 1;

  const availableThermoPresets = thermometerPresetsMilesForGameSize(gameSize);
  const sessionThermoPresets = session.thermometerPresetMiles?.filter(
    (miles): miles is ThermometerDistanceOptionMiles =>
      availableThermoPresets.includes(miles as ThermometerDistanceOptionMiles),
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
    customThermometerPresetsEnabled: (sessionThermoPresets?.length ?? 0) > 0,
    thermometerPresetMiles:
      sessionThermoPresets?.length
        ? sessionThermoPresets
        : defaults.thermometerPresetMiles,
    customTentacleMediumRadiusEnabled:
      typeof session.tentacleMediumRadiusMeters === "number",
    tentacleMediumRadiusMeters:
      session.tentacleMediumRadiusMeters ?? defaults.tentacleMediumRadiusMeters,
    customTentacleLargeRadiusEnabled:
      typeof session.tentacleLargeRadiusMeters === "number",
    tentacleLargeRadiusMeters:
      session.tentacleLargeRadiusMeters ?? defaults.tentacleLargeRadiusMeters,
  };
}

export function sessionRulesPatchFromAdvancedSettings(
  gameSize: GameSize,
  settings: AdvancedSessionSettingsValue,
): SessionRulesPatch {
  const patch: SessionRulesPatch = {};

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
    const available = thermometerPresetsMilesForGameSize(gameSize);
    const selected = settings.thermometerPresetMiles.filter((miles) =>
      available.includes(miles),
    );
    if (selected.length > 0) {
      patch.thermometerPresetMiles = selected;
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

  return patch;
}

export function mergeSessionRulesPatch(
  session: SessionRecord,
  patch: SessionRulesPatch,
): SessionRecord {
  const gameSize = session.gameSize ?? "medium";

  return {
    ...session,
    hidingZoneRadiusMeters:
      patch.hidingZoneRadiusMeters ??
      session.hidingZoneRadiusMeters ??
      hidingZoneRadiusMeters(gameSize),
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
    tentacleMediumRadiusMeters:
      patch.tentacleMediumRadiusMeters !== undefined
        ? patch.tentacleMediumRadiusMeters
        : session.tentacleMediumRadiusMeters,
    tentacleLargeRadiusMeters:
      patch.tentacleLargeRadiusMeters !== undefined
        ? patch.tentacleLargeRadiusMeters
        : session.tentacleLargeRadiusMeters,
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
  miles: ThermometerDistanceOptionMiles,
  gameSize: GameSize,
): AdvancedSessionSettingsValue {
  const available = thermometerPresetsMilesForGameSize(gameSize);
  if (!available.includes(miles)) {
    return settings;
  }

  const current = new Set(settings.thermometerPresetMiles);
  if (current.has(miles)) {
    if (current.size <= 1) {
      return settings;
    }
    current.delete(miles);
  } else {
    current.add(miles);
  }

  const nextPresets = available.filter((preset) => current.has(preset));

  return {
    ...settings,
    customThermometerPresetsEnabled: true,
    thermometerPresetMiles: nextPresets,
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
    | "tentacleMediumRadiusMeters"
    | "tentacleLargeRadiusMeters"
  >,
): SessionRecord {
  const patch = sessionRulesPatchFromAdvancedSettings(gameSize, settings);
  const merged = mergeSessionRulesPatch(
    {
      ...base,
      gameSize,
      hidingZoneRadiusMeters:
        patch.hidingZoneRadiusMeters ?? hidingZoneRadiusMeters(gameSize),
    },
    patch,
  );

  return merged;
}
