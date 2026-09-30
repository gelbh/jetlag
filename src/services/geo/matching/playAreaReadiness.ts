/**
 * Turf-free play-area cache + sync readiness. Route loading steps / warm
 * state read `isPlayAreaReadySync` on the App boot path; the loaders stay in
 * `resolveSessionMatchingAreas` (which re-exports these).
 */
import type { GameArea, SessionRecord } from "@/domain/map/annotations";
import {
  BUNDLED_REGION_PACK_GEO_REVISION,
  type RegionPackId,
} from "@/domain/regions/regionPack";
import { isKnownRegionPack } from "@/domain/regions/regionPackRegistry";

export type SessionPlayAreaInput = Pick<
  SessionRecord,
  "gameArea" | "regionPackId" | "regionPackSubregionId"
>;

export const resolvedPlayAreaCache = new Map<string, GameArea>();
/** Pack keys that failed to load — ready for settle, but no geometry cached. */
export const failedPlayAreaKeys = new Set<string>();

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
  return (
    resolvedPlayAreaCache.has(cacheKey) || failedPlayAreaKeys.has(cacheKey)
  );
}
