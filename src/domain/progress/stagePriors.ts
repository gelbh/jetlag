/**
 * First-run expected durations per history key. Starting guesses, replaced by
 * per-device duration history after one completed sample.
 */
export const STAGE_PRIORS_MS: Readonly<Record<string, number>> = {
  "queue:overpass": 4_000,
  "bundle:places": 800,
  "bundle:coastline": 800,
  "bundle:boundaries": 1_500,
  "overpass:matching-point": 6_000,
  "overpass:admin-geom": 10_000,
  "overpass:landmass": 10_000,
  "overpass:transit": 5_000,
  "overpass:measuring-places": 6_000,
  "overpass:linear": 8_000,
  "overpass:coastline": 8_000,
  "overpass:tentacle": 5_000,
  "overpass:stations": 4_000,
  "parse:overpass": 200,
  "compute:nearest-areas": 500,
  "compute:landmass-union": 2_000,
  "compute:segments": 500,
  "compute:near-region": 500,
  "compute:shade": 500,
  "refine:lod-pass": 300,
  "elevation:seeker": 1_500,
  "elevation:refine": 3_000,
  "truth:matching": 1_000,
  "truth:measuring": 3_000,
  "truth:gtfs": 2_000,
  "mask:wasm": 600,
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
  "route:step": 700,
  "geocode:search": 1_500,
  "import:loader": 500,
  "import:read": 500,
  "import:convert": 500,
  "photo:compress": 500,
  "photo:upload": 2_000,
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
