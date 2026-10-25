/**
 * First-run expected durations per history key. Starting guesses, replaced by
 * per-device duration history after one completed sample.
 */
export const STAGE_PRIORS_MS: Readonly<Record<string, number>> = {
  "queue:overpass": 4_000,
  "bundle:places": 800,
  "bundle:coastline": 800,
  "bundle:boundaries": 1_500,
  "compute:pack-play-area": 500,
  "overpass:matching-point": 6_000,
  "overpass:admin-geom": 10_000,
  "preload:admin-probe": 3_000,
  "preload:admin-level": 10_000,
  "preload:category-probe": 3_000,
  "overpass:landmass": 10_000,
  "overpass:transit": 5_000,
  "overpass:measuring-places": 6_000,
  "overpass:linear": 8_000,
  "overpass:coastline": 8_000,
  "overpass:tentacle": 5_000,
  "overpass:stations": 4_000,
  "compute:landmass-union": 2_000,
  "compute:segments": 500,
  "compute:shade": 500,
  "elevation:seeker": 1_500,
  "elevation:sampling": 15_000,
  "elevation:refine": 3_000,
  "truth:matching": 1_000,
  "truth:measuring": 3_000,
  "truth:other": 300,
  "truth:reveal": 1_000,
  "mask:prepare": 300,
  "mask:union": 800,
  "session:sign-in": 1_000,
  "session:join": 1_500,
  "session:hider-role": 2_000,
  "session:open-map": 500,
  "session:verify-access": 1_000,
  "session:play-area": 300,
  "session:create": 1_500,
  "session:matching-areas": 1_500,
  "geocode:search": 1_500,
  "photo:compress": 500,
  "photo:upload": 2_000,
  "import:loader": 500,
  "import:convert": 500,
  "capture:loader": 500,
  "capture:render": 1_000,
};

export const DEFAULT_STAGE_PRIOR_MS = 1_000;

export function stagePriorMs(historyKey: string): number {
  return STAGE_PRIORS_MS[historyKey] ?? DEFAULT_STAGE_PRIOR_MS;
}

/** History size bucket for an area (km²) or an input count. */
export function sizeBucket(size: number): number {
  return size > 1 ? Math.floor(Math.log2(size)) : 0;
}
