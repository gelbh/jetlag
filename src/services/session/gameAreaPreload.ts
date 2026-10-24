import type { GameArea, SessionTier } from "../../domain/map/annotations";
import type { StageSpec } from "../../domain/progress/progressTree";
import type { MeasuringLocationCategory } from "../../domain/questions";
import type { RegionPackId } from "../../domain/regions/regionPack";
import type {
  CustomMatchingAreasByLevel,
  MatchingAdminLevel,
} from "../../domain/session/catalog/sessionCustomContent";
import { usePreloadStore } from "../../state/preloadStore";
import { createLoadTask, type LoadTask } from "../core/progress/loadTask";
import {
  adminBoundaryLevelsForSession,
  emptyAdminDivisionCounts,
  probeAdminDivisionCounts,
} from "../geo/overpass/adminDivisionAvailability";
import { fetchAdminDivisionFeaturesInArea } from "../geo/overpass/adminDivisionBoundaries";
import { fetchMeasuringPlacesInArea } from "../geo/overpass/measuringPlaces";
import { fetchStaticTransit } from "../transit/transitStatic";

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

export function preloadMeasuringCategoriesForTests(): readonly MeasuringLocationCategory[] {
  return PRELOAD_MEASURING_CATEGORIES;
}

/** Preload shares the Overpass pool with user questions but never holds more than one slot. */
const BACKGROUND_LANE = { priority: "background" } as const;

export function gameAreaPreloadKey(gameArea: GameArea): string {
  return JSON.stringify(gameArea.coordinates);
}

function buildPreloadJobs(
  gameArea: GameArea,
  customMatchingAreas?: CustomMatchingAreasByLevel,
  regionPackId?: RegionPackId,
  options?: { includeAdminProbe?: boolean; subregionId?: string },
): Array<() => Promise<unknown>> {
  const jobs: Array<() => Promise<unknown>> = [() => fetchStaticTransit(gameArea, BACKGROUND_LANE)];
  const measuringOptions = {
    ...BACKGROUND_LANE,
    ...(options?.subregionId ? { subregionId: options.subregionId } : {}),
  };

  if (options?.includeAdminProbe !== false) {
    jobs.push(() =>
      probeAdminDivisionCounts(gameArea, customMatchingAreas, regionPackId, BACKGROUND_LANE).then(
        (counts) => {
          usePreloadStore.getState().setAdminDivisionCounts(gameAreaPreloadKey(gameArea), counts);
          return counts;
        },
      ),
    );
  }

  for (const adminLevel of adminBoundaryLevelsForSession(regionPackId, customMatchingAreas)) {
    jobs.push(() =>
      fetchAdminDivisionFeaturesInArea(
        gameArea,
        adminLevel,
        customMatchingAreas?.[adminLevel as MatchingAdminLevel],
        BACKGROUND_LANE,
      ),
    );
  }

  for (const category of PRELOAD_MEASURING_CATEGORIES) {
    jobs.push(() =>
      fetchMeasuringPlacesInArea(gameArea, category, [], regionPackId, measuringOptions),
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
  subregionId?: string,
): void {
  void preloadGameAreaCachesAsync(gameArea, customMatchingAreas, regionPackId, tier, subregionId);
}

export async function preloadGameAreaCachesAsync(
  gameArea: GameArea,
  customMatchingAreas?: CustomMatchingAreasByLevel,
  regionPackId?: RegionPackId,
  tier: SessionTier = "free",
  subregionId?: string,
): Promise<void> {
  const gameAreaKey = gameAreaPreloadKey(gameArea);
  const jobs = buildPreloadJobs(gameArea, customMatchingAreas, regionPackId, {
    includeAdminProbe: false,
    subregionId,
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
      BACKGROUND_LANE,
    );
  } catch {}
  usePreloadStore.getState().setAdminDivisionCounts(gameAreaKey, counts);
  usePreloadStore.getState().recordSuccess(gameAreaKey);

  await runPreloadQueue(gameAreaKey, jobs, jobGapMs, signal);
}

let activeCriticalTask: LoadTask | null = null;

/** Cancels the critical preload so its activity chip does not outlive the session. */
export function abortCriticalGameAreaPreload(): void {
  activeCriticalTask?.cancel();
  activeCriticalTask = null;
}

const CRITICAL_PROBE_STAGE: StageSpec = {
  kind: "fetch",
  label: "Checking area divisions",
  historyKey: "preload:admin-probe",
};

const CRITICAL_LEVEL_STAGE: StageSpec = {
  kind: "fetch",
  label: "Loading area boundaries",
  historyKey: "preload:admin-level",
};

/**
 * Admin boundaries the first questions need, started at create/join. Tracked in
 * its own preload store slice and as a global background task for the ETA.
 */
export async function preloadCriticalGameAreaCaches(
  gameArea: GameArea,
  customMatchingAreas?: CustomMatchingAreasByLevel,
  regionPackId?: RegionPackId,
): Promise<void> {
  const gameAreaKey = gameAreaPreloadKey(gameArea);
  const adminLevels = adminBoundaryLevelsForSession(regionPackId, customMatchingAreas);
  const store = usePreloadStore.getState();
  store.resetCritical(gameAreaKey, adminLevels.length + 1);

  activeCriticalTask?.cancel();
  const task = createLoadTask({
    label: "Caching area boundaries",
    priority: "background",
    global: true,
  });
  activeCriticalTask = task;
  const load = { priority: task.priority, signal: task.signal };
  // Stages are created up front so the bar's weights stay put.
  const probeStage = task.stage(CRITICAL_PROBE_STAGE);
  const levelStages = adminLevels.map(() => task.stage(CRITICAL_LEVEL_STAGE));

  let counts = emptyAdminDivisionCounts();
  try {
    probeStage.start();
    counts = await probeAdminDivisionCounts(gameArea, customMatchingAreas, regionPackId, load);
    probeStage.finish();
    store.recordCriticalJob(gameAreaKey, "success");
  } catch {
    probeStage.cancel();
    store.recordCriticalJob(gameAreaKey, "failure");
  }
  usePreloadStore.getState().setAdminDivisionCounts(gameAreaKey, counts);

  await Promise.allSettled(
    adminLevels.map((adminLevel, index) =>
      fetchAdminDivisionFeaturesInArea(
        gameArea,
        adminLevel,
        customMatchingAreas?.[adminLevel as MatchingAdminLevel],
        { ...load, node: levelStages[index] },
      ).then(
        () => store.recordCriticalJob(gameAreaKey, "success"),
        () => {
          levelStages[index]?.cancel();
          store.recordCriticalJob(gameAreaKey, "failure");
        },
      ),
    ),
  );
  task.complete();
  if (activeCriticalTask === task) {
    activeCriticalTask = null;
  }
}

export function preloadJobGapMsForTests(): number {
  return PRELOAD_JOB_GAP_MS;
}

export function preloadJobGapPremiumMsForTests(): number {
  return PRELOAD_JOB_GAP_PREMIUM_MS;
}
