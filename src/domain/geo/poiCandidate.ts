import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import { haversineMeters } from "@/domain/geometry/gameArea/distance";

export type PoiCandidateSource = "tile" | "bundle" | "overpass";
export type PoiConfirmStatus = "provisional" | "confirmed";

export interface PoiCandidate {
  id: string;
  name: string;
  point: LatLngTuple;
  categoryId?: string;
  source: PoiCandidateSource;
  confirmStatus: PoiConfirmStatus;
  osmId?: string;
}

/** ~50 m merge radius for name+point dedupe across tile / confirm sources. */
export const POI_MERGE_DISTANCE_METERS = 50;

const SOURCE_RANK: Record<PoiCandidateSource, number> = {
  tile: 0,
  overpass: 1,
  bundle: 2,
};

export function normalizePoiName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function poiCandidatesMatch(
  a: PoiCandidate,
  b: PoiCandidate,
  maxDistanceMeters: number = POI_MERGE_DISTANCE_METERS,
): boolean {
  if (normalizePoiName(a.name) !== normalizePoiName(b.name)) {
    return false;
  }
  return haversineMeters(a.point, b.point) <= maxDistanceMeters;
}

/**
 * Prefer confirmed over provisional; among equals prefer bundle > overpass > tile.
 * Incoming upgrades matching existing entries; unmatched existing are kept.
 */
export function mergePoiCandidates(
  existing: readonly PoiCandidate[],
  incoming: readonly PoiCandidate[],
): PoiCandidate[] {
  const merged: PoiCandidate[] = existing.map((c) => ({ ...c }));

  for (const next of incoming) {
    const matchIndex = merged.findIndex((c) => poiCandidatesMatch(c, next));
    if (matchIndex < 0) {
      merged.push({ ...next });
      continue;
    }
    merged[matchIndex] = preferPoiCandidate(merged[matchIndex], next);
  }

  return merged;
}

function preferPoiCandidate(a: PoiCandidate, b: PoiCandidate): PoiCandidate {
  const aConfirmed = a.confirmStatus === "confirmed";
  const bConfirmed = b.confirmStatus === "confirmed";
  if (aConfirmed !== bConfirmed) {
    return bConfirmed ? { ...b } : { ...a };
  }
  if (SOURCE_RANK[b.source] !== SOURCE_RANK[a.source]) {
    return SOURCE_RANK[b.source] > SOURCE_RANK[a.source] ? { ...b } : { ...a };
  }
  return { ...b };
}

/** Returns true only when the candidate is safe for scored commit / shade / elim. */
export function assertConfirmedForCommit(candidate: PoiCandidate): boolean {
  if (candidate.confirmStatus !== "confirmed") {
    return false;
  }
  if (candidate.source === "tile") {
    return false;
  }
  return true;
}
