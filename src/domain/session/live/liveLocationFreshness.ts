import { formatFreshnessAge } from "../../admin/formatAdminFreshness";

/** Age at which a shared live pin is removed from the map. */
export const LIVE_LOCATION_GONE_MS = 10 * 60 * 1000;

/** Shared UI tick for opacity / last-seen refresh. */
export const LIVE_LOCATION_FRESHNESS_TICK_MS = 15_000;

export function liveLocationAgeMs(
  updatedAt: string,
  nowMs: number,
): number | null {
  const updatedAtMs = Date.parse(updatedAt);
  if (!Number.isFinite(updatedAtMs)) {
    return null;
  }
  return Math.max(0, nowMs - updatedAtMs);
}

export function isLiveLocationGone(
  updatedAt: string,
  nowMs: number,
): boolean {
  const ageMs = liveLocationAgeMs(updatedAt, nowMs);
  if (ageMs === null) {
    return true;
  }
  return ageMs >= LIVE_LOCATION_GONE_MS;
}

/** Linear fade from 1 (fresh) to 0 (gone). Gone ages return 0. */
export function liveLocationFillOpacity(
  updatedAt: string,
  nowMs: number,
): number {
  const ageMs = liveLocationAgeMs(updatedAt, nowMs);
  if (ageMs === null || ageMs >= LIVE_LOCATION_GONE_MS) {
    return 0;
  }
  return 1 - ageMs / LIVE_LOCATION_GONE_MS;
}

export function formatLiveLocationLastSeen(
  updatedAt: string,
  nowMs: number,
): string {
  const age = formatFreshnessAge(updatedAt, nowMs);
  if (age === "never") {
    return "Last seen unknown";
  }
  return `Last seen ${age}`;
}

/** Oldest (stalest) updatedAt among members, or null if empty. */
export function oldestLiveLocationUpdatedAt(
  updatedAts: readonly string[],
): string | null {
  let oldest: string | null = null;
  let oldestMs = Number.POSITIVE_INFINITY;
  for (const updatedAt of updatedAts) {
    const ms = Date.parse(updatedAt);
    if (!Number.isFinite(ms)) {
      continue;
    }
    if (ms < oldestMs) {
      oldestMs = ms;
      oldest = updatedAt;
    }
  }
  return oldest;
}

export interface LiveClusterPresentation {
  fillOpacity: number;
  lastSeenLabel: string | null;
}

export function liveClusterPresentation(
  updatedAts: readonly string[],
  nowMs: number,
): LiveClusterPresentation {
  const oldestUpdatedAt = oldestLiveLocationUpdatedAt(updatedAts);
  if (oldestUpdatedAt === null) {
    return { fillOpacity: 0, lastSeenLabel: null };
  }
  return {
    fillOpacity: liveLocationFillOpacity(oldestUpdatedAt, nowMs),
    lastSeenLabel: formatLiveLocationLastSeen(oldestUpdatedAt, nowMs),
  };
}
