import { BUNDLED_PRESET_PLAY_AREA_SQ_MI } from "./playAreas";
import type { BundledGamePresetDefinition } from "./shared";

type PresetDraft = Omit<BundledGamePresetDefinition, "playAreaSquareMiles">;

export function attachPlayArea(definition: PresetDraft): BundledGamePresetDefinition {
  const playAreaSquareMiles = BUNDLED_PRESET_PLAY_AREA_SQ_MI[definition.id];
  if (playAreaSquareMiles === undefined) {
    throw new Error(`Missing play area for bundled preset ${definition.id}`);
  }

  return { ...definition, playAreaSquareMiles };
}
