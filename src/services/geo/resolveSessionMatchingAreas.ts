import type { SessionRecord } from "../../domain/map/annotations";
import type { CustomMatchingAreasByLevel } from "../../domain/session/sessionCustomContent";
import type { RegionPackId } from "../../domain/regions/regionPack";
import { isKnownRegionPack } from "../../domain/regions/regionPackRegistry";
import { loadRegionPackMatchingAreas } from "./regionPackBoundaries";

const MATCHING_ADMIN_LEVELS = [8, 9] as const;

function hasBundledMatchingLevels(
  areas: CustomMatchingAreasByLevel | undefined,
): boolean {
  if (!areas) {
    return false;
  }

  return MATCHING_ADMIN_LEVELS.every((level) => Boolean(areas[level]));
}

const resolvedMatchingAreasCache = new Map<string, CustomMatchingAreasByLevel>();

export function matchingAreasCacheKey(
  regionPackId: RegionPackId | undefined,
  regionPackSubregionId: string | undefined,
  hasSessionCustomAreas: boolean,
): string {
  return [
    regionPackId ?? "",
    regionPackSubregionId ?? "",
    hasSessionCustomAreas ? "custom" : "",
  ].join(":");
}

export function clearResolvedMatchingAreasCacheForTests(): void {
  resolvedMatchingAreasCache.clear();
}

export type SessionMatchingAreasInput = Pick<
  SessionRecord,
  "regionPackId" | "regionPackSubregionId" | "customMatchingAreas"
>;

export async function resolveSessionMatchingAreas(
  session: SessionMatchingAreasInput,
): Promise<CustomMatchingAreasByLevel | undefined> {
  if (hasBundledMatchingLevels(session.customMatchingAreas)) {
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
