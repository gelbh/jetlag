import {
  boundingBoxAreaKm2,
  gameAreaToBoundingBoxRaw,
  intersectBoundingBoxesRaw,
} from "@/domain/geometry/gameArea/gameAreaBounds";
import type { GameArea } from "@/domain/map/annotations";
import { REGION_PACK_REFERENCE_BBOXES } from "./packGeoManifest";
import { REGION_PACK_IDS, type RegionPackId } from "./regionPack";

export const PACK_ATTACH_MIN_INTERSECTION_RATIO = 0.05;

export const PACK_ATTACH_MIN_INTERSECTION_KM2 = 25;

export type PackAttachSuggestion = {
  packId: RegionPackId;
  score: number;
};

export type PackAttachSource = "auto" | "manual" | "bundled";

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

export function playAreaAttachFingerprint(gameArea: GameArea | null): string | null {
  if (!gameArea) {
    return null;
  }
  const box = gameAreaToBoundingBoxRaw(gameArea);
  return `${box.south}:${box.west}:${box.north}:${box.east}`;
}

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
      source: seededPackId !== undefined && seededPackId === suggestion.packId ? "bundled" : "auto",
      showRequestCta: false,
    };
  }

  return {
    packId: undefined,
    source: "auto",
    showRequestCta: Boolean(gameArea),
  };
}

export function suggestRegionPackForGameArea(
  gameArea: GameArea,
  options?: SuggestRegionPackOptions,
): PackAttachSuggestion | null {
  const minRatio = options?.minIntersectionRatio ?? PACK_ATTACH_MIN_INTERSECTION_RATIO;
  const minKm2 = options?.minIntersectionKm2 ?? PACK_ATTACH_MIN_INTERSECTION_KM2;

  const gameBox = gameAreaToBoundingBoxRaw(gameArea);

  let best: (PackAttachSuggestion & { intersectionKm2: number }) | null = null;

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
    const beatsBest =
      !best ||
      score > best.score ||
      (score === best.score && intersectionKm2 > best.intersectionKm2);
    if (beatsBest) {
      best = { packId, score, intersectionKm2 };
    }
  }

  return best ? { packId: best.packId, score: best.score } : null;
}
