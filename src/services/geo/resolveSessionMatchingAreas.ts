import type { GameArea, SessionRecord } from "../../domain/map/annotations";
import type { CustomMatchingAreasByLevel } from "../../domain/session/sessionCustomContent";
import {
  BUNDLED_REGION_PACK_GEO_REVISION,
  type RegionPackId,
} from "../../domain/regions/regionPack";
import { isKnownRegionPack } from "../../domain/regions/regionPackRegistry";
import {
  loadRegionPackMatchingAreas,
  loadRegionPackPlayArea,
} from "./regionPackBoundaries";

const MATCHING_ADMIN_LEVELS = [8, 9] as const;

function hasBundledMatchingLevels(
  areas: CustomMatchingAreasByLevel | undefined,
): boolean {
  if (!areas) {
    return false;
  }

  return MATCHING_ADMIN_LEVELS.every((level) => Boolean(areas[level]));
}

function bundledGeoRevisionIsCurrent(
  revision: number | undefined,
): boolean {
  return revision === BUNDLED_REGION_PACK_GEO_REVISION;
}

const resolvedMatchingAreasCache = new Map<string, CustomMatchingAreasByLevel>();
const resolvedPlayAreaCache = new Map<string, GameArea>();

export function matchingAreasCacheKey(
  regionPackId: RegionPackId | undefined,
  regionPackSubregionId: string | undefined,
  hasSessionCustomAreas: boolean,
): string {
  return [
    String(BUNDLED_REGION_PACK_GEO_REVISION),
    regionPackId ?? "",
    regionPackSubregionId ?? "",
    hasSessionCustomAreas ? "custom" : "",
  ].join(":");
}

export function playAreaCacheKey(
  regionPackId: RegionPackId | undefined,
  regionPackSubregionId: string | undefined,
): string {
  return [
    String(BUNDLED_REGION_PACK_GEO_REVISION),
    regionPackId ?? "",
    regionPackSubregionId ?? "",
  ].join(":");
}

export function clearResolvedMatchingAreasCacheForTests(): void {
  resolvedMatchingAreasCache.clear();
  resolvedPlayAreaCache.clear();
}

export type SessionMatchingAreasInput = Pick<
  SessionRecord,
  | "regionPackId"
  | "regionPackSubregionId"
  | "customMatchingAreas"
  | "bundledGeoRevision"
>;

export type SessionPlayAreaInput = Pick<
  SessionRecord,
  "gameArea" | "regionPackId" | "regionPackSubregionId"
>;

export async function resolveSessionMatchingAreas(
  session: SessionMatchingAreasInput,
): Promise<CustomMatchingAreasByLevel | undefined> {
  if (
    hasBundledMatchingLevels(session.customMatchingAreas) &&
    bundledGeoRevisionIsCurrent(session.bundledGeoRevision)
  ) {
    return session.customMatchingAreas;
  }

  const packId = session.regionPackId;
  if (!isKnownRegionPack(packId)) {
    return session.customMatchingAreas;
  }

  const cacheKey = matchingAreasCacheKey(
    packId,
    session.regionPackSubregionId,
    false,
  );
  const cached = resolvedMatchingAreasCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const areas = await loadRegionPackMatchingAreas(
    packId,
    session.regionPackSubregionId,
  );
  resolvedMatchingAreasCache.set(cacheKey, areas);
  return areas;
}

export function isPlayAreaReadySync(
  session: SessionPlayAreaInput | null | undefined,
): boolean {
  if (!session) {
    return true;
  }

  const packId = session.regionPackId;
  if (!isKnownRegionPack(packId)) {
    return true;
  }

  const cacheKey = playAreaCacheKey(packId, session.regionPackSubregionId);
  return resolvedPlayAreaCache.has(cacheKey);
}

export async function resolveSessionPlayArea(
  session: SessionPlayAreaInput,
): Promise<GameArea> {
  const packId = session.regionPackId;
  if (!isKnownRegionPack(packId)) {
    return session.gameArea;
  }

  const cacheKey = playAreaCacheKey(packId, session.regionPackSubregionId);
  const cached = resolvedPlayAreaCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const playArea = await loadRegionPackPlayArea(
    packId,
    session.regionPackSubregionId,
  );
  resolvedPlayAreaCache.set(cacheKey, playArea);
  return playArea;
}
