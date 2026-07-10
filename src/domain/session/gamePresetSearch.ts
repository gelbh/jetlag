import {
  bundledPresetDefinition,
  isBundledPresetId,
} from "../regions/bundledGamePresets";
import { formatBundledPresetLocation } from "../regions/bundledPresetHierarchy";
import type { GamePreset } from "./gamePreset";

function presetSearchHaystack(preset: GamePreset): string {
  const parts = [preset.name];
  if (preset.placeLabel) {
    parts.push(preset.placeLabel);
  }
  if (isBundledPresetId(preset.id)) {
    const definition = bundledPresetDefinition(preset.id);
    if (definition) {
      parts.push(formatBundledPresetLocation(definition));
    }
  }
  return parts.join(" ").toLowerCase();
}

function compareFilteredPresets(left: GamePreset, right: GamePreset): number {
  const leftBundled = isBundledPresetId(left.id);
  const rightBundled = isBundledPresetId(right.id);
  if (leftBundled !== rightBundled) {
    return leftBundled ? -1 : 1;
  }
  return left.name.localeCompare(right.name);
}

export function filterGamePresetsForSearch(
  presets: readonly GamePreset[],
  query: string,
): GamePreset[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [...presets];
  }

  return presets
    .filter((preset) => presetSearchHaystack(preset).includes(normalized))
    .sort(compareFilteredPresets);
}
