import type { GameArea, SessionTier } from "../../domain/map/annotations";
import type { MeasuringLocationCategory } from "../../domain/questions/measuringQuestions";
import type { CustomMatchingAreasByLevel } from "../../domain/session/sessionCustomContent";
import type { RegionPackId } from "../../domain/regions/regionPack";
import { fetchAdminDivisionFeaturesInArea } from "../geo/adminDivisionBoundaries";
import { probeAdminDivisionCounts, emptyAdminDivisionCounts } from "../geo/adminDivisionAvailability";
import { fetchPreparedCoastlineSegments } from "../geo/coastline";
import { fetchLandmassFeaturesInArea } from "../geo/landmassFeatures";
import { fetchMeasuringPlacesInArea } from "../geo/measuringPlaces";
import { fetchPreparedMeasuringLinearSegments } from "../geo/measuringLinearFeatures";
import { fetchStaticTransit } from "../transit/transitStatic";
import { usePreloadStore } from "../../state/preloadStore";

const PRELOAD_ADMIN_LEVELS = [4, 6, 8, 9] as const;
const PRELOAD_JOB_GAP_MS = 400;
const PRELOAD_JOB_GAP_PREMIUM_MS = 100;

export function preloadJobGapMsForTier(tier: "free" | "premium"): number {
  return tier === "premium" ? PRELOAD_JOB_GAP_PREMIUM_MS : PRELOAD_JOB_GAP_MS;
}

const PRELOAD_MEASURING_CATEGORIES = [
  "commercial_airport",
  "rail_station",
  "mountain",
  "park",
  "museum",
] as const satisfies readonly MeasuringLocationCategory[];

const PRELOAD_LINEAR_KINDS = [
  "international_border",
  "admin2_border",
  "admin3_border",
  "admin4_border",
] as const;

export function gameAreaPreloadKey(gameArea: GameArea): string {
  return JSON.stringify(gameArea.coordinates);
}

function buildPreloadJobs(
  gameArea: GameArea,
  customMatchingAreas?: CustomMatchingAreasByLevel,
  regionPackId?: RegionPackId,
): Array<() => Promise<unknown>> {
  const jobs: Array<() => Promise<unknown>> = [
    () => fetchPreparedCoastlineSegments(gameArea),
    () => fetchLandmassFeaturesInArea(gameArea),
    () => fetchStaticTransit(gameArea),
    () =>
      probeAdminDivisionCounts(
        gameArea,
        customMatchingAreas,
        regionPackId,
      ).then((counts) => {
        usePreloadStore
          .getState()
          .setAdminDivisionCounts(gameAreaPreloadKey(gameArea), counts);
        return counts;
      }),
  ];

  for (const adminLevel of PRELOAD_ADMIN_LEVELS) {
    jobs.push(() =>
      fetchAdminDivisionFeaturesInArea(
        gameArea,
        adminLevel,
        customMatchingAreas?.[adminLevel],
      ),
    );
  }

  for (const category of PRELOAD_MEASURING_CATEGORIES) {
    jobs.push(() => fetchMeasuringPlacesInArea(gameArea, category));
  }

  for (const kind of PRELOAD_LINEAR_KINDS) {
    jobs.push(() =>
      fetchPreparedMeasuringLinearSegments(gameArea, kind, customMatchingAreas),
    );
  }

  return jobs;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runTrackedPreloadJob(
  gameAreaKey: string,
  task: () => Promise<unknown>,
): Promise<void> {
  try {
    await task();
    usePreloadStore.getState().recordSuccess(gameAreaKey);
  } catch {
    usePreloadStore.getState().recordFailure(gameAreaKey);
  }
}

async function runPreloadQueue(
  gameAreaKey: string,
  jobs: Array<() => Promise<unknown>>,
  jobGapMs: number,
  signal?: AbortSignal,
): Promise<void> {
  for (let index = 0; index < jobs.length; index += 1) {
    if (signal?.aborted) {
      return;
    }

    await runTrackedPreloadJob(gameAreaKey, jobs[index]);
    if (signal?.aborted) {
      return;
    }

    if (index < jobs.length - 1) {
      await sleep(jobGapMs);
    }
  }
}

let activePreloadAbort: AbortController | null = null;

function handleVisibilityForPreload(): void {
  if (typeof document === "undefined") {
    return;
  }

  if (document.visibilityState === "hidden") {
    activePreloadAbort?.abort();
    activePreloadAbort = null;
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", handleVisibilityForPreload);
}

export function preloadGameAreaCaches(
  gameArea: GameArea,
  customMatchingAreas?: CustomMatchingAreasByLevel,
  regionPackId?: RegionPackId,
  tier: SessionTier = "free",
): void {
  const gameAreaKey = gameAreaPreloadKey(gameArea);
  const jobs = buildPreloadJobs(gameArea, customMatchingAreas, regionPackId);
  usePreloadStore.getState().reset(gameAreaKey, jobs.length);

  activePreloadAbort?.abort();
  activePreloadAbort = new AbortController();
  const { signal } = activePreloadAbort;
  const jobGapMs = preloadJobGapMsForTier(tier);

  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return;
  }

  void runPreloadQueue(gameAreaKey, jobs, jobGapMs, signal);
}

export async function preloadCriticalGameAreaCaches(
  gameArea: GameArea,
  customMatchingAreas?: CustomMatchingAreasByLevel,
  regionPackId?: RegionPackId,
): Promise<void> {
  let counts = emptyAdminDivisionCounts();
  try {
    counts = await probeAdminDivisionCounts(
      gameArea,
      customMatchingAreas,
      regionPackId,
    );
  } catch {
    // probe failure is non-fatal; preload continues with empty counts
  }
  usePreloadStore
    .getState()
    .setAdminDivisionCounts(gameAreaPreloadKey(gameArea), counts);

  await Promise.allSettled([
    fetchPreparedCoastlineSegments(gameArea),
    fetchLandmassFeaturesInArea(gameArea),
    ...PRELOAD_ADMIN_LEVELS.map((adminLevel) =>
      fetchAdminDivisionFeaturesInArea(
        gameArea,
        adminLevel,
        customMatchingAreas?.[adminLevel],
      ),
    ),
  ]);
}

export function preloadJobGapMsForTests(): number {
  return PRELOAD_JOB_GAP_MS;
}

export function preloadJobGapPremiumMsForTests(): number {
  return PRELOAD_JOB_GAP_PREMIUM_MS;
}
