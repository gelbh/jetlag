import { BUNDLED_GAME_PRESET_DEFINITIONS } from "../regions/bundledGamePresets";
import { titleCase } from "../regions/bundledPresets/shared";
import type { RegionPackId } from "../regions/regionPack";
import { getTransitMetro } from "../../services/transit/transitCatalog";

export interface AdminSessionAreaInput {
  gameAreaLabel?: string | null;
  regionPackId?: string | null;
  regionPackSubregionId?: string | null;
  transitMetroId?: string | null;
}

export function resolveAdminSessionAreaLabel(
  input: AdminSessionAreaInput,
): string | null {
  const trimmedLabel = input.gameAreaLabel?.trim();
  if (trimmedLabel) {
    return trimmedLabel;
  }

  if (input.regionPackId) {
    const packId = input.regionPackId as RegionPackId;

    if (input.regionPackSubregionId) {
      const subregionPreset = BUNDLED_GAME_PRESET_DEFINITIONS.find(
        (preset) =>
          preset.regionPackId === packId &&
          preset.subregionId === input.regionPackSubregionId,
      );
      if (subregionPreset) {
        return subregionPreset.placeLabel;
      }
    }

    const metroPreset = BUNDLED_GAME_PRESET_DEFINITIONS.find(
      (preset) => preset.regionPackId === packId && !preset.subregionId,
    );
    if (metroPreset) {
      return metroPreset.placeLabel;
    }
  }

  const metro = getTransitMetro(input.transitMetroId ?? undefined);
  if (metro) {
    return metro.label;
  }

  if (input.regionPackId) {
    return titleCase(input.regionPackId);
  }

  return null;
}
