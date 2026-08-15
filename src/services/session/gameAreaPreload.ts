import type { GameArea, SessionTier } from "../../domain/map/annotations";
import type { MeasuringLocationCategory } from "../../domain/questions";
import type {
  CustomMatchingAreasByLevel,
  MatchingAdminLevel,
} from "../../domain/session/catalog/sessionCustomContent";
import type { RegionPackId } from "../../domain/regions/regionPack";
import { fetchAdminDivisionFeaturesInArea } from "../geo/overpass/adminDivisionBoundaries";
import {
  adminBoundaryLevelsForSession,
  emptyAdminDivisionCounts,
  probeAdminDivisionCounts,
} from "../geo/overpass/adminDivisionAvailability";
import { fetchMeasuringPlacesInArea } from "../geo/overpass/measuringPlaces";
import { fetchStaticTransit } from "../transit/transitStatic";
import { usePreloadStore } from "../../state/preloadStore";

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

/** Test hook — keep assertions aligned with background measuring preload jobs. */
export function preloadMeasuringCategoriesForTests(): readonly MeasuringLocationCategory[] {
  return PRELOAD_MEASURING_CATEGORIES;
}

export function gameAreaPreloadKey(gameArea: GameArea): string {
  return JSON.stringify(gameArea.coordinates);
}

function buildPreloadJobs(
  gameArea: GameArea,
  customMatchingAreas?: CustomMatchingAreasByLevel,
  regionPackId?: RegionPackId,
  options?: { includeAdminProbe?: boolean },
): Array<() => Promise<unknown>> {
  const jobs: Array<() => Promise<unknown>> = [
    () => fetchStaticTransit(gameArea),
  ];

  if (options?.includeAdminProbe !== false) {
    jobs.push(() =>
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
    );
  }

  for (const adminLevel of adminBoundaryLevelsForSession(
    regionPackId,
    customMatchingAreas,
  )) {
    jobs.push(() =>
      fetchAdminDivisionFeaturesInArea(
        gameArea,
        adminLevel,
        customMatchingAreas?.[adminLevel as MatchingAdminLevel],
      ),
    );
  }

  for (const category of PRELOAD_MEASURING_CATEGORIES) {
    jobs.push(() =>
      fetchMeasuringPlacesInArea(gameArea, category, [], regionPackId),
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

export function abortActiveGameAreaPreload(): void {
  activePreloadAbort?.abort();
  activePreloadAbort = null;
}

function handleVisibilityForPreload(): void {
  if (typeof document === "undefined") {
    return;
  }

  if (document.visibilityState === "hidden") {
    abortActiveGameAreaPreload();
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
  void preloadGameAreaCachesAsync(
    gameArea,
    customMatchingAreas,
    regionPackId,
    tier,
  );
}

export async function preloadGameAreaCachesAsync(
  gameArea: GameArea,
  customMatchingAreas?: CustomMatchingAreasByLevel,
  regionPackId?: RegionPackId,
  tier: SessionTier = "free",
): Promise<void> {
  const gameAreaKey = gameAreaPreloadKey(gameArea);
  const jobs = buildPreloadJobs(gameArea, customMatchingAreas, regionPackId, {
    includeAdminProbe: false,
  });
  usePreloadStore.getState().reset(gameAreaKey, jobs.length + 1);

  activePreloadAbort?.abort();
  activePreloadAbort = new AbortController();
  const { signal } = activePreloadAbort;
  const jobGapMs = preloadJobGapMsForTier(tier);

  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return;
  }

  let counts = emptyAdminDivisionCounts();
  try {
    counts = await probeAdminDivisionCounts(
      gameArea,
      customMatchingAreas,
      regionPackId,
    );
  } catch {
    // probe failure is non-fatal; background preload continues with empty counts
  }
  usePreloadStore.getState().setAdminDivisionCounts(gameAreaKey, counts);
  usePreloadStore.getState().recordSuccess(gameAreaKey);

  await runPreloadQueue(gameAreaKey, jobs, jobGapMs, signal);
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

  await Promise.allSettled(
    adminBoundaryLevelsForSession(regionPackId, customMatchingAreas).map(
      (adminLevel) =>
        fetchAdminDivisionFeaturesInArea(
          gameArea,
          adminLevel,
          customMatchingAreas?.[adminLevel as MatchingAdminLevel],
        ),
    ),
  );
}

export function preloadJobGapMsForTests(): number {
  return PRELOAD_JOB_GAP_MS;
}

export function preloadJobGapPremiumMsForTests(): number {
  return PRELOAD_JOB_GAP_PREMIUM_MS;
}
