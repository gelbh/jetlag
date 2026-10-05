import booleanIntersects from "@turf/boolean-intersects";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import {
  type BoundingBox,
  boundingBoxAreaKm2,
  gameAreaToBoundingBoxRaw,
  intersectBoundingBoxesRaw,
} from "@/domain/geometry/gameArea/gameAreaBounds";
import { gameAreaToPolygon, isPointInGameArea } from "@/domain/geometry/gameArea/geometry";
import type { GameArea } from "@/domain/map/annotations";
import {
  PACK_ATTACH_MIN_INTERSECTION_KM2,
  PACK_ATTACH_MIN_INTERSECTION_RATIO,
} from "@/domain/regions/packAttach";
import { REGION_PACK_REFERENCE_BBOXES } from "@/domain/regions/packGeoManifest";
import type { RegionPackId } from "@/domain/regions/regionPack";
import type {
  CustomMatchingAreasByLevel,
  MatchingAdminLevel,
  SessionCustomLocationPin,
} from "../catalog/sessionCustomContent";
import type { GamePreset } from "./gamePreset";

const MATCHING_ADMIN_LEVELS: readonly MatchingAdminLevel[] = [4, 6, 8, 9];

export type PresetDataReuseOptions = {
  excludePresetIds?: readonly string[];
  /** When set, pack fields apply only if winner.score > basePackScore */
  basePackScore?: number;
  minIntersectionRatio?: number;
  minIntersectionKm2?: number;
};

export type PresetDataReuseSuggestion = {
  regionPackId?: RegionPackId;
  subregionId?: string;
  transitMetroId?: string;
  packScore?: number;
  customMatchingAreas?: CustomMatchingAreasByLevel;
  customLocationPins?: readonly SessionCustomLocationPin[];
  sourcePresetIds: string[];
};

type Qualifier = {
  preset: GamePreset;
  score: number;
  referenceAreaKm2: number;
};

function referenceBoxForPreset(preset: GamePreset): BoundingBox | null {
  if (preset.gameArea) {
    return gameAreaToBoundingBoxRaw(preset.gameArea);
  }
  if (preset.regionPackId) {
    return REGION_PACK_REFERENCE_BBOXES[preset.regionPackId] ?? null;
  }
  return null;
}

function scorePresetAgainstFrame(
  framedBox: BoundingBox,
  preset: GamePreset,
  minRatio: number,
  minKm2: number,
): Qualifier | null {
  const referenceBox = referenceBoxForPreset(preset);
  if (!referenceBox) {
    return null;
  }

  const intersection = intersectBoundingBoxesRaw(framedBox, referenceBox);
  if (!intersection) {
    return null;
  }

  const referenceAreaKm2 = boundingBoxAreaKm2(referenceBox);
  if (referenceAreaKm2 <= 0) {
    return null;
  }

  const intersectionKm2 = boundingBoxAreaKm2(intersection);
  const thresholdKm2 = Math.max(minRatio * referenceAreaKm2, minKm2);
  if (intersectionKm2 < thresholdKm2) {
    return null;
  }

  return {
    preset,
    score: intersectionKm2 / referenceAreaKm2,
    referenceAreaKm2,
  };
}

function pickPackWinner(qualifiers: readonly Qualifier[]): Qualifier | null {
  let best: Qualifier | null = null;
  for (const candidate of qualifiers) {
    if (!candidate.preset.regionPackId) {
      continue;
    }
    if (
      !best ||
      candidate.score > best.score ||
      (candidate.score === best.score &&
        (candidate.referenceAreaKm2 < best.referenceAreaKm2 ||
          (candidate.referenceAreaKm2 === best.referenceAreaKm2 &&
            candidate.preset.id < best.preset.id)))
    ) {
      best = candidate;
    }
  }
  return best;
}

function resolveBasePackScore(
  framedBox: BoundingBox,
  presets: readonly GamePreset[],
  options: PresetDataReuseOptions | undefined,
  minRatio: number,
  minKm2: number,
): number | undefined {
  if (typeof options?.basePackScore === "number") {
    return options.basePackScore;
  }

  const excludeIds = options?.excludePresetIds;
  if (!excludeIds?.length) {
    return undefined;
  }

  const excluded = new Set(excludeIds);
  let base: number | undefined;
  for (const preset of presets) {
    if (!excluded.has(preset.id) || !preset.regionPackId) {
      continue;
    }
    const scored = scorePresetAgainstFrame(framedBox, preset, minRatio, minKm2);
    if (!scored) {
      continue;
    }
    if (base === undefined || scored.score > base) {
      base = scored.score;
    }
  }
  return base;
}

function featureKey(feature: Feature): string | null {
  if (typeof feature.id === "string" || typeof feature.id === "number") {
    return String(feature.id);
  }
  const propsId = feature.properties?.id;
  if (typeof propsId === "string" || typeof propsId === "number") {
    return String(propsId);
  }
  return null;
}

function mergeMatchingAreas(
  qualifiers: readonly Qualifier[],
  framedPolygon: ReturnType<typeof gameAreaToPolygon>,
): CustomMatchingAreasByLevel | undefined {
  const merged: CustomMatchingAreasByLevel = {};

  for (const level of MATCHING_ADMIN_LEVELS) {
    const byId = new Map<string, Feature<Polygon | MultiPolygon>>();
    let nextAnonymous = 0;

    for (const { preset } of qualifiers) {
      const raw = preset.customMatchingAreas?.[level];
      if (!raw) {
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }

      if (
        !parsed ||
        typeof parsed !== "object" ||
        (parsed as FeatureCollection).type !== "FeatureCollection" ||
        !Array.isArray((parsed as FeatureCollection).features)
      ) {
        continue;
      }

      for (const feature of (parsed as FeatureCollection).features) {
        if (!feature?.geometry) {
          continue;
        }
        if (feature.geometry.type !== "Polygon" && feature.geometry.type !== "MultiPolygon") {
          continue;
        }
        const polyFeature = feature as Feature<Polygon | MultiPolygon>;
        if (!booleanIntersects(polyFeature, framedPolygon)) {
          continue;
        }
        const key = featureKey(polyFeature) ?? `anon:${level}:${nextAnonymous++}`;
        if (!byId.has(key)) {
          byId.set(key, polyFeature);
        }
      }
    }

    if (byId.size > 0) {
      merged[level] = JSON.stringify({
        type: "FeatureCollection",
        features: [...byId.values()],
      } satisfies FeatureCollection);
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

function mergePins(
  qualifiers: readonly Qualifier[],
  gameArea: GameArea,
): SessionCustomLocationPin[] | undefined {
  const byId = new Map<string, SessionCustomLocationPin>();
  for (const { preset } of qualifiers) {
    for (const pin of preset.customLocationPins ?? []) {
      if (byId.has(pin.id)) {
        continue;
      }
      if (!isPointInGameArea(pin.point, gameArea)) {
        continue;
      }
      byId.set(pin.id, pin);
    }
  }
  return byId.size > 0 ? [...byId.values()] : undefined;
}

export function suggestPresetDataReuseForGameArea(
  gameArea: GameArea,
  presets: readonly GamePreset[],
  options?: PresetDataReuseOptions,
): PresetDataReuseSuggestion {
  const minRatio = options?.minIntersectionRatio ?? PACK_ATTACH_MIN_INTERSECTION_RATIO;
  const minKm2 = options?.minIntersectionKm2 ?? PACK_ATTACH_MIN_INTERSECTION_KM2;
  const framedBox = gameAreaToBoundingBoxRaw(gameArea);
  const excluded = new Set(options?.excludePresetIds ?? []);

  const qualifiers: Qualifier[] = [];
  for (const preset of presets) {
    if (excluded.has(preset.id)) {
      continue;
    }
    const scored = scorePresetAgainstFrame(framedBox, preset, minRatio, minKm2);
    if (scored) {
      qualifiers.push(scored);
    }
  }

  if (qualifiers.length === 0) {
    return { sourcePresetIds: [] };
  }

  const framedPolygon = gameAreaToPolygon(gameArea);
  const customLocationPins = mergePins(qualifiers, gameArea);
  const customMatchingAreas = mergeMatchingAreas(qualifiers, framedPolygon);
  const sourcePresetIds = qualifiers.map((q) => q.preset.id);

  const suggestion: PresetDataReuseSuggestion = {
    sourcePresetIds,
    ...(customLocationPins ? { customLocationPins } : {}),
    ...(customMatchingAreas ? { customMatchingAreas } : {}),
  };

  const winner = pickPackWinner(qualifiers);
  if (!winner?.preset.regionPackId) {
    return suggestion;
  }

  const basePackScore = resolveBasePackScore(framedBox, presets, options, minRatio, minKm2);
  if (typeof basePackScore === "number" && winner.score <= basePackScore) {
    return suggestion;
  }

  suggestion.regionPackId = winner.preset.regionPackId;
  suggestion.packScore = winner.score;
  if (winner.preset.subregionId !== undefined) {
    suggestion.subregionId = winner.preset.subregionId;
  }
  if (winner.preset.transitMetroId !== undefined) {
    suggestion.transitMetroId = winner.preset.transitMetroId;
  }

  return suggestion;
}
