import type { GameArea } from "@/domain/map/annotations";
import { loadRegionPackSessionBoundaries } from "@/services/geo/matching/regionPackBoundaries";
import { type GamePreset, gamePresetToCreateSessionDraft } from "./gamePreset";

export type ResolvePresetPlayAreasResult =
  | { ok: true; areas: GameArea[] }
  | { ok: false; presetId: string; message: string };

export async function resolvePresetPlayAreas(
  presetsById: ReadonlyMap<string, GamePreset>,
  orderedIds: readonly string[],
  loadBoundaries: typeof loadRegionPackSessionBoundaries = loadRegionPackSessionBoundaries,
): Promise<ResolvePresetPlayAreasResult> {
  if (orderedIds.length === 0) {
    return {
      ok: false,
      presetId: "",
      message: "Select at least one preset.",
    };
  }

  const areas: GameArea[] = [];

  for (const presetId of orderedIds) {
    const preset = presetsById.get(presetId);
    if (!preset) {
      return {
        ok: false,
        presetId,
        message: `Unknown preset: ${presetId}`,
      };
    }

    const draft = gamePresetToCreateSessionDraft(preset);
    if (draft.gameArea) {
      areas.push(draft.gameArea);
      continue;
    }

    if (draft.regionPackId) {
      const boundaries = await loadBoundaries(draft.regionPackId, draft.subregionId);
      areas.push(boundaries.playArea);
      continue;
    }

    return {
      ok: false,
      presetId,
      message: `Preset "${preset.name}" has no play area.`,
    };
  }

  return { ok: true, areas };
}
