import type { GameArea, SessionRecord } from "@/domain/map/annotations";
import { BUNDLED_REGION_PACK_GEO_REVISION, type RegionPackId } from "@/domain/regions/regionPack";
import { isKnownRegionPack } from "@/domain/regions/regionPackRegistry";
import type { CustomMatchingAreasByLevel } from "@/domain/session/catalog/sessionCustomContent";
import {
  failedPlayAreaKeys,
  isPlayAreaReadySync,
  playAreaCacheKey,
  resolvedPlayAreaCache,
  type SessionPlayAreaInput,
} from "./playAreaReadiness";
import { loadRegionPackMatchingAreas, loadRegionPackPlayArea } from "./regionPackBoundaries";

export { isPlayAreaReadySync, playAreaCacheKey };

const MATCHING_ADMIN_LEVELS = [8, 9] as const;

function hasBundledMatchingLevels(areas: CustomMatchingAreasByLevel | undefined): boolean {
  if (!areas) {
    return false;
  }

  return MATCHING_ADMIN_LEVELS.every((level) => Boolean(areas[level]));
}

function bundledGeoRevisionIsCurrent(revision: number | undefined): boolean {
  return revision === BUNDLED_REGION_PACK_GEO_REVISION;
}

const resolvedMatchingAreasCache = new Map<string, CustomMatchingAreasByLevel>();
const inFlightPlayAreaLoads = new Map<string, Promise<GameArea>>();

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

export function clearResolvedMatchingAreasCacheForTests(): void {
  resolvedMatchingAreasCache.clear();
  resolvedPlayAreaCache.clear();
  inFlightPlayAreaLoads.clear();
  failedPlayAreaKeys.clear();
}

export type SessionMatchingAreasInput = Pick<
  SessionRecord,
  "regionPackId" | "regionPackSubregionId" | "customMatchingAreas" | "bundledGeoRevision"
>;

export type { SessionPlayAreaInput };

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

  const cacheKey = matchingAreasCacheKey(packId, session.regionPackSubregionId, false);
  const cached = resolvedMatchingAreasCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const areas = await loadRegionPackMatchingAreas(packId, session.regionPackSubregionId);
  resolvedMatchingAreasCache.set(cacheKey, areas);
  return areas;
}

export function peekResolvedPlayArea(
  session: SessionPlayAreaInput | null | undefined,
): GameArea | undefined {
  if (!session) {
    return undefined;
  }

  const packId = session.regionPackId;
  if (!isKnownRegionPack(packId)) {
    return undefined;
  }

  const cacheKey = playAreaCacheKey(packId, session.regionPackSubregionId);
  return resolvedPlayAreaCache.get(cacheKey);
}

export async function resolveSessionPlayArea(session: SessionPlayAreaInput): Promise<GameArea> {
  const packId = session.regionPackId;
  if (!isKnownRegionPack(packId)) {
    return session.gameArea;
  }

  const cacheKey = playAreaCacheKey(packId, session.regionPackSubregionId);
  const cached = resolvedPlayAreaCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const inFlight = inFlightPlayAreaLoads.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  // Register the in-flight promise before invoking the loader so concurrent
  // callers coalesce even if the loader starts synchronously.
  let settle!: (value: GameArea) => void;
  const loadPromise = new Promise<GameArea>((resolve) => {
    settle = resolve;
  });
  inFlightPlayAreaLoads.set(cacheKey, loadPromise);

  void loadRegionPackPlayArea(packId, session.regionPackSubregionId)
    .then(
      (playArea) => {
        failedPlayAreaKeys.delete(cacheKey);
        resolvedPlayAreaCache.set(cacheKey, playArea);
        settle(playArea);
      },
      () => {
        // Mark ready without caching session.gameArea under the pack key —
        // fallback geometry is session-specific and must not poison other sessions.
        failedPlayAreaKeys.add(cacheKey);
        settle(session.gameArea);
      },
    )
    .finally(() => {
      inFlightPlayAreaLoads.delete(cacheKey);
    });

  return loadPromise;
}
