import type { DistanceUnit } from "../../map/distance";
import type { GameSize } from "../gameSize";
import { thermometerPresetsMetersForGameSize } from "../gameSizeRules";
import {
  ALL_CONFIGURABLE_TOOLS,
  type ConfigurableMapTool,
} from "../sessionRules";
import type { AdvancedSessionSettingsValue } from "./types";

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
