import type { GamePreset } from "./gamePreset";

export function isFavouritePresetId(
  favouritePresetIds: readonly string[],
  presetId: string,
): boolean {
  return favouritePresetIds.includes(presetId);
}

export function resolveFavouritePresets(
  presets: readonly GamePreset[],
  favouritePresetIds: readonly string[],
): GamePreset[] {
  if (favouritePresetIds.length === 0) {
    return [];
  }

  const presetsById = new Map(presets.map((preset) => [preset.id, preset]));
  const resolved: GamePreset[] = [];

  for (const id of favouritePresetIds) {
    const preset = presetsById.get(id);
    if (preset) {
      resolved.push(preset);
    }
  }

  return resolved;
}

export function sortPresetsWithFavouritesFirst(
  presets: readonly GamePreset[],
  favouritePresetIds: readonly string[],
): GamePreset[] {
  if (favouritePresetIds.length === 0) {
    return [...presets];
  }

  const favouriteSet = new Set(favouritePresetIds);
  const favourites: GamePreset[] = [];
  const rest: GamePreset[] = [];

  for (const preset of presets) {
    if (favouriteSet.has(preset.id)) {
      favourites.push(preset);
    } else {
      rest.push(preset);
    }
  }

  return [...favourites, ...rest];
}

export function buildFavouritePresetSelectOptions(
  presets: readonly GamePreset[],
  favouritePresetIds: readonly string[],
): { presetId: string; name: string }[] {
  return resolveFavouritePresets(presets, favouritePresetIds).map((preset) => ({
    presetId: preset.id,
    name: preset.name,
  }));
}

export function withoutFavouritePresetId(
  favouritePresetIds: readonly string[],
  presetId: string,
): string[] {
  return favouritePresetIds.filter((id) => id !== presetId);
}
