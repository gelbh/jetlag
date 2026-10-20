import type { GameArea, SessionRecord } from "@/domain/map/annotations";
import { BUNDLED_REGION_PACK_GEO_REVISION, type RegionPackId } from "@/domain/regions/regionPack";
import { getRegionPackConfig, isKnownRegionPack } from "@/domain/regions/regionPackRegistry";
import type { CustomMatchingAreasByLevel } from "@/domain/session/catalog/sessionCustomContent";
import {
  failedPlayAreaKeys,
  isPlayAreaReadySync,
  playAreaCacheKey,
  resolvedPlayAreaCache,
  type SessionPlayAreaInput,
  sessionUsesPackPlayArea,
} from "./playAreaReadiness";
import { loadRegionPackMatchingAreas, loadRegionPackPlayArea } from "./regionPackBoundaries";

export { isPlayAreaReadySync, playAreaCacheKey, sessionUsesPackPlayArea };

/**
 * Session bundled matching is complete when level 8 is present, and level 9
 * when the pack ships a secondary asset (dual-depth metros). Single-depth packs
 * (no secondary) are complete with level 8 only.
 */
export function hasBundledMatchingLevels(
  areas: CustomMatchingAreasByLevel | undefined,
  regionPackId?: RegionPackId,
): boolean {
  if (!areas?.[8]) {
    return false;
  }

  const config = regionPackId ? getRegionPackConfig(regionPackId) : undefined;
  if (config && !config.geoAssets.secondary) {
    return true;
  }

  return Boolean(areas[9]);
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
    hasBundledMatchingLevels(session.customMatchingAreas, session.regionPackId) &&
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
  if (!sessionUsesPackPlayArea(session)) {
    return undefined;
  }

  const cacheKey = playAreaCacheKey(session.regionPackId, session.regionPackSubregionId);
  return resolvedPlayAreaCache.get(cacheKey);
}

export async function resolveSessionPlayArea(session: SessionPlayAreaInput): Promise<GameArea> {
  if (!sessionUsesPackPlayArea(session)) {
    return session.gameArea;
  }

  const packId = session.regionPackId;
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
