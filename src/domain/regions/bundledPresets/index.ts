import { attachPlayArea } from "./attachPlayArea";
import { dublinPresets } from "./dublin";
import { londonPresets } from "./london";
import { nycPresets } from "./nyc";
import { osakaPresets } from "./osaka";
import { portlandMainePresets } from "./portlandMaine";
import { princeRupertPresets } from "./princeRupert";
import { swissPresets } from "./swiss";
import { tokyoPresets } from "./tokyo";
import type { BundledGamePresetDefinition } from "./shared";
import type { GamePreset } from "../../session/gamePreset";
import { GAME_PRESET_SCHEMA_VERSION } from "../../session/gamePreset";
import { defaultAdvancedSessionSettings } from "../../session/advancedSessionSettings";
import { recommendGameSizeFromPlayAreaSquareMiles } from "../../session/gameSize";

export type { BundledGamePresetDefinition } from "./shared";
export { EXPANSION_ON, titleCase } from "./shared";

export const BUNDLED_GAME_PRESET_DEFINITIONS: readonly BundledGamePresetDefinition[] =
  [
    ...dublinPresets(),
    ...nycPresets(),
    ...portlandMainePresets(),
    ...londonPresets(),
    ...tokyoPresets(),
    ...osakaPresets(),
    ...swissPresets(),
    ...princeRupertPresets(),
  ];

export function isBundledPresetId(id: string): boolean {
  return id.startsWith("bundled:");
}

export function bundledPresetDefinition(
  id: string,
): BundledGamePresetDefinition | undefined {
  return BUNDLED_GAME_PRESET_DEFINITIONS.find((preset) => preset.id === id);
}

export function buildBundledGamePresets(now = new Date().toISOString()): GamePreset[] {
  return BUNDLED_GAME_PRESET_DEFINITIONS.map((definition) => {
    const distanceUnit = definition.distanceUnit ?? "metric";
    const gameSize = recommendGameSizeFromPlayAreaSquareMiles(
      definition.playAreaSquareMiles,
      distanceUnit,
    );
    const defaults = defaultAdvancedSessionSettings(gameSize, distanceUnit);
    return {
      id: definition.id,
      name: definition.name,
      createdAt: now,
      updatedAt: now,
      schemaVersion: GAME_PRESET_SCHEMA_VERSION,
      gameSize,
      distanceUnit,
      advancedSettings: {
        ...defaults,
        ...definition.advancedSettingsPatch,
      },
      placeLabel: definition.placeLabel,
      regionPackId: definition.regionPackId,
      subregionId: definition.subregionId,
      transitMetroId: definition.transitMetroId,
      bundled: true,
      migrationStatus: "ok" as const,
    };
  });
}

export function mergeBundledPresets(existing: GamePreset[]): GamePreset[] {
  const userPresets = existing.filter((preset) => !isBundledPresetId(preset.id));
  const bundledCreatedAt =
    existing.find((preset) => isBundledPresetId(preset.id))?.createdAt ??
    new Date().toISOString();
  const bundled = buildBundledGamePresets(bundledCreatedAt);
  return [...bundled, ...userPresets];
}

export { attachPlayArea };
