import {
  gameAreaToBoundingBox,
  type BoundingBox,
} from "@/domain/geometry/gameArea/gameAreaBounds";
import type { GameArea } from "@/domain/map/annotations";
import { regionPackReferenceBoundingBox } from "./packGeoManifest";
import { REGION_PACK_IDS, type RegionPackId } from "./regionPack";

/**
 * Minimum intersection / pack-bbox ratio (α) for a pack attach suggestion.
 * Threshold is max(α × packArea, β km²).
 */
export const PACK_ATTACH_MIN_INTERSECTION_RATIO = 0.05;

/**
 * Minimum absolute intersection area in km² (β) for a pack attach suggestion.
 * Threshold is max(α × packArea, β km²).
 */
export const PACK_ATTACH_MIN_INTERSECTION_KM2 = 25;

/** Equirectangular km per degree of latitude (same family as 111_320 m elsewhere). */
const KM_PER_DEG_LAT = 111.32;

export type PackAttachSuggestion =
  | { packId: RegionPackId; score: number }
  | null;

export type SuggestRegionPackOptions = {
  minIntersectionRatio?: number;
  minIntersectionKm2?: number;
};

/**
 * Raw axis-aligned bbox intersection without {@link normalizeBoundingBox}.
 * Tiny intersections must stay tiny for attach scoring thresholds.
 */
export function intersectBoundingBoxesRaw(
  a: BoundingBox,
  b: BoundingBox,
): BoundingBox | null {
  const south = Math.max(a.south, b.south);
  const west = Math.max(a.west, b.west);
  const north = Math.min(a.north, b.north);
  const east = Math.min(a.east, b.east);

  if (south >= north || west >= east) {
    return null;
  }

  return { south, west, north, east };
}

/**
 * Approximate bbox area in km² via mid-latitude equirectangular projection.
 */
export function boundingBoxAreaKm2(box: BoundingBox): number {
  const midLat = (box.north + box.south) / 2;
  const latKm = (box.north - box.south) * KM_PER_DEG_LAT;
  const lngKm =
    (box.east - box.west) * KM_PER_DEG_LAT * Math.cos((midLat * Math.PI) / 180);
  return Math.max(latKm * lngKm, 0);
}

/**
 * Suggest the best region pack for a game area by bbox overlap.
 *
 * Score = intersection area / pack reference bbox area (both km²).
 * A pack qualifies when intersection area ≥ max(α × packArea, β km²).
 * Among qualifying packs, the highest score wins.
 */
export function suggestRegionPackForGameArea(
  gameArea: GameArea,
  options?: SuggestRegionPackOptions,
): PackAttachSuggestion {
  const minRatio =
    options?.minIntersectionRatio ?? PACK_ATTACH_MIN_INTERSECTION_RATIO;
  const minKm2 =
    options?.minIntersectionKm2 ?? PACK_ATTACH_MIN_INTERSECTION_KM2;

  const gameBox = gameAreaToBoundingBox(gameArea);

  let best: { packId: RegionPackId; score: number } | null = null;

  for (const packId of REGION_PACK_IDS) {
    const packBox = regionPackReferenceBoundingBox(packId);
    const intersection = intersectBoundingBoxesRaw(gameBox, packBox);
    if (!intersection) {
      continue;
    }

    const packAreaKm2 = boundingBoxAreaKm2(packBox);
    if (packAreaKm2 <= 0) {
      continue;
    }

    const intersectionKm2 = boundingBoxAreaKm2(intersection);
    const thresholdKm2 = Math.max(minRatio * packAreaKm2, minKm2);
    if (intersectionKm2 < thresholdKm2) {
      continue;
    }

    const score = intersectionKm2 / packAreaKm2;
    if (!best || score > best.score) {
      best = { packId, score };
    }
  }

  return best;
}
