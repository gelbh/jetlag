import {
  boundingBoxAreaKm2,
  gameAreaToBoundingBoxRaw,
  intersectBoundingBoxesRaw,
} from "@/domain/geometry/gameArea/gameAreaBounds";
import type { GameArea } from "@/domain/map/annotations";
import { REGION_PACK_REFERENCE_BBOXES } from "./packGeoManifest";
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

export type PackAttachSuggestion = {
  packId: RegionPackId;
  score: number;
};

/** How the current region pack was chosen for a draft play area. */
export type PackAttachSource = "auto" | "manual" | "bundled";

/** Sticky clear/change until the play-area AABB fingerprint changes. */
export type PackAttachManualOverride = {
  fingerprint: string | null;
  packId: RegionPackId | undefined;
};

export type PackAttachResolved = {
  packId: RegionPackId | undefined;
  source: PackAttachSource;
  showRequestCta: boolean;
};

export type SuggestRegionPackOptions = {
  minIntersectionRatio?: number;
  minIntersectionKm2?: number;
};

/** AABB fingerprint for sticky manual pack override (not full-geometry hash). */
export function playAreaAttachFingerprint(
  gameArea: GameArea | null,
): string | null {
  if (!gameArea) {
    return null;
  }
  const box = gameAreaToBoundingBoxRaw(gameArea);
  return `${box.south}:${box.west}:${box.north}:${box.east}`;
}

/**
 * Resolve quiet pack-attach chrome from suggestion + optional sticky manual override.
 */
export function resolvePackAttachChrome(input: {
  gameArea: GameArea | null;
  fingerprint: string | null;
  suggestion: PackAttachSuggestion | null;
  manual: PackAttachManualOverride | null;
  seededPackId?: RegionPackId;
}): PackAttachResolved {
  const { gameArea, fingerprint, suggestion, manual, seededPackId } = input;

  if (manual && manual.fingerprint === fingerprint) {
    return {
      packId: manual.packId,
      source: "manual",
      showRequestCta: Boolean(gameArea) && manual.packId == null,
    };
  }

  if (suggestion) {
    return {
      packId: suggestion.packId,
      source:
        seededPackId !== undefined && seededPackId === suggestion.packId
          ? "bundled"
          : "auto",
      showRequestCta: false,
    };
  }

  return {
    packId: undefined,
    source: "auto",
    showRequestCta: Boolean(gameArea),
  };
}

/**
 * Suggest the best region pack for a game area by bbox overlap.
 *
 * Uses unexpanded game-area AABB (no min-span inflate) and raw rect intersect
 * so α/β thresholds are not coupled to play-area UX expand constants.
 *
 * Score = intersection area / pack reference bbox area (both km²).
 * A pack qualifies when intersection area ≥ max(α × packArea, β km²).
 * Among qualifying packs, the highest score wins.
 */
export function suggestRegionPackForGameArea(
  gameArea: GameArea,
  options?: SuggestRegionPackOptions,
): PackAttachSuggestion | null {
  const minRatio =
    options?.minIntersectionRatio ?? PACK_ATTACH_MIN_INTERSECTION_RATIO;
  const minKm2 =
    options?.minIntersectionKm2 ?? PACK_ATTACH_MIN_INTERSECTION_KM2;

  const gameBox = gameAreaToBoundingBoxRaw(gameArea);

  let best: PackAttachSuggestion | null = null;

  for (const packId of REGION_PACK_IDS) {
    const packBox = REGION_PACK_REFERENCE_BBOXES[packId];
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
