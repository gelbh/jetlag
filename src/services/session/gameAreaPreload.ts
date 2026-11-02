import type { GameArea, SessionTier } from "../../domain/map/annotations";
import type { StageSpec } from "../../domain/progress/progressTree";
import type { MeasuringLocationCategory } from "../../domain/questions";
import type { RegionPackId } from "../../domain/regions/regionPack";
import { playAreaCategoryPresenceProbeSpecs } from "../../domain/session/catalog/playAreaCategoryPresence";
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
import { probePlayAreaCategoryCounts } from "../geo/overpass/playAreaCategoryPresenceProbe";
import { fetchStaticTransit } from "../transit/transitStatic";

async function warmCategoryPresenceCounts(gameArea: GameArea, gameAreaKey: string): Promise<void> {
  try {
    const counts = await probePlayAreaCategoryCounts(
      gameArea,
      playAreaCategoryPresenceProbeSpecs(),
    );
    usePreloadStore.getState().setCategoryPresenceCounts(gameAreaKey, counts);
  } catch {
    // Soft-fail: leave categoryPresenceCounts unset so resolve stays available until reactive.
  }
}

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

function waitUntilVisible(signal: AbortSignal): Promise<void> {
  if (typeof document === "undefined" || document.visibilityState !== "hidden" || signal.aborted) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const settle = () => {
      if (document.visibilityState === "hidden" && !signal.aborted) {
        return;
      }
      document.removeEventListener("visibilitychange", settle);
      signal.removeEventListener("abort", settle);
      resolve();
    };
    document.addEventListener("visibilitychange", settle);
    signal.addEventListener("abort", settle);
  });
}

async function runTrackedPreloadJob(
  gameAreaKey: string,
  task: () => Promise<unknown>,
  signal: AbortSignal,
): Promise<void> {
  let ok = true;
  try {
    await task();
  } catch {
    ok = false;
  }

  if (!signal.aborted) {
    const store = usePreloadStore.getState();
    if (ok) {
      store.recordSuccess(gameAreaKey);
    } else {
      store.recordFailure(gameAreaKey);
    }
  }
}

async function runPreloadQueue(
  gameAreaKey: string,
  jobs: Array<() => Promise<unknown>>,
  jobGapMs: number,
  signal: AbortSignal,
): Promise<void> {
  for (let index = 0; index < jobs.length; index += 1) {
    await waitUntilVisible(signal);
    if (signal.aborted) {
      return;
    }

    await runTrackedPreloadJob(gameAreaKey, jobs[index], signal);
    if (signal.aborted) {
      return;
    }

    if (index < jobs.length - 1) {
      await sleep(jobGapMs);
    }
  }
}

interface PreloadRun {
  identity: string;
  controller: AbortController;
  promise: Promise<void>;
}

let activeRun: PreloadRun | null = null;

export function abortActiveGameAreaPreload(): void {
  activeRun?.controller.abort();
  activeRun = null;
}

function preloadRunIdentity(
  gameAreaKey: string,
  customMatchingAreas: CustomMatchingAreasByLevel | undefined,
  regionPackId: RegionPackId | undefined,
  subregionId: string | undefined,
): string {
  return JSON.stringify([
    gameAreaKey,
    regionPackId ?? null,
    subregionId ?? null,
    adminBoundaryLevelsForSession(regionPackId, customMatchingAreas),
  ]);
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

/** Repeat calls with the same inputs join the current run, even after it settles, until session teardown. */
export function preloadGameAreaCachesAsync(
  gameArea: GameArea,
  customMatchingAreas?: CustomMatchingAreasByLevel,
  regionPackId?: RegionPackId,
  tier: SessionTier = "free",
  subregionId?: string,
): Promise<void> {
  const gameAreaKey = gameAreaPreloadKey(gameArea);
  const identity = preloadRunIdentity(gameAreaKey, customMatchingAreas, regionPackId, subregionId);
  if (activeRun?.identity === identity) {
    return activeRun.promise;
  }

  activeRun?.controller.abort();
  const controller = new AbortController();
  const promise = runGameAreaPreload(
    gameArea,
    gameAreaKey,
    customMatchingAreas,
    regionPackId,
    tier,
    subregionId,
    controller.signal,
  );
  activeRun = { identity, controller, promise };
  return promise;
}

async function runGameAreaPreload(
  gameArea: GameArea,
  gameAreaKey: string,
  customMatchingAreas: CustomMatchingAreasByLevel | undefined,
  regionPackId: RegionPackId | undefined,
  tier: SessionTier,
  subregionId: string | undefined,
  signal: AbortSignal,
): Promise<void> {
  const jobs = buildPreloadJobs(gameArea, customMatchingAreas, regionPackId, {
    includeAdminProbe: false,
    subregionId,
  });
  const store = usePreloadStore.getState();
  // +2: admin division probe + category presence probe (warmed before the queue).
  store.reset(gameAreaKey, jobs.length + 2);

  await waitUntilVisible(signal);
  if (signal.aborted) {
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
  if (signal.aborted) {
    return;
  }
  store.setAdminDivisionCounts(gameAreaKey, counts);
  store.recordSuccess(gameAreaKey);

  await warmCategoryPresenceCounts(gameArea, gameAreaKey);
  if (signal.aborted) {
    return;
  }
  store.recordSuccess(gameAreaKey);

  await runPreloadQueue(gameAreaKey, jobs, preloadJobGapMsForTier(tier), signal);
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

const CRITICAL_CATEGORY_STAGE: StageSpec = {
  kind: "fetch",
  label: "Checking places in the area",
  historyKey: "preload:category-probe",
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
  store.resetCritical(gameAreaKey, adminLevels.length + 2);

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
  const categoryStage = task.stage(CRITICAL_CATEGORY_STAGE);
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
  categoryStage.start();
  await warmCategoryPresenceCounts(gameArea, gameAreaKey);
  categoryStage.finish();
  store.recordCriticalJob(gameAreaKey, "success");

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
