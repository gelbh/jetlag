import type { DistanceUnit } from "../map/distance";
import type { GameArea } from "../map/annotations";
import type { BoundingBox } from "../geometry/gameArea/gameAreaBounds";
import type { GameSize } from "../session/size/gameSize";
import type { RegionPackId } from "../regions/regionPack";
import type { PreloadPresetSnapshot } from "./preloadRequestTypes";

export interface BuildPreloadPresetSnapshotInput {
  name: string;
  placeLabel?: string;
  gameSize: GameSize;
  distanceUnit: DistanceUnit;
  focusBounds?: BoundingBox | null;
  gameArea?: GameArea | null;
  regionPackId?: RegionPackId;
  presetId?: string;
}

/** Size-capped snapshot for createPreloadRequest (no full gameArea geometry). */
export function buildPreloadPresetSnapshot(
  input: BuildPreloadPresetSnapshotInput,
): PreloadPresetSnapshot | null {
  const name = input.name.trim();
  if (!name) {
    return null;
  }

  const snapshot: PreloadPresetSnapshot = {
    name,
    gameSize: input.gameSize,
    distanceUnit: input.distanceUnit,
  };

  const placeLabel = input.placeLabel?.trim();
  if (placeLabel) {
    snapshot.placeLabel = placeLabel;
  }

  if (input.focusBounds) {
    snapshot.focusBounds = input.focusBounds;
  }

  if (input.gameArea) {
    snapshot.gameAreaBytes = new TextEncoder().encode(
      JSON.stringify(input.gameArea),
    ).length;
  }

  if (input.regionPackId) {
    snapshot.regionPackId = input.regionPackId;
  }

  if (input.presetId) {
    snapshot.presetId = input.presetId;
  }

  return snapshot;
}
