import type { GameArea } from "../../domain/map/annotations";
import type { MeasuringLocationCategory } from "../../domain/questions/measuringQuestions";
import { fetchAdminDivisionFeaturesInArea } from "../geo/adminDivisionBoundaries";
import { fetchPreparedCoastlineSegments } from "../geo/coastline";
import { fetchLandmassFeaturesInArea } from "../geo/landmassFeatures";
import { fetchMeasuringPlacesInArea } from "../geo/measuringPlaces";
import { fetchPreparedMeasuringLinearSegments } from "../geo/measuringLinearFeatures";
import { fetchStaticTransit } from "../transit/transitStatic";
import { usePreloadStore } from "../../state/preloadStore";

const PRELOAD_ADMIN_LEVELS = [4, 6, 8] as const;
const PRELOAD_JOB_GAP_MS = 400;

const PRELOAD_MEASURING_CATEGORIES = [
  "commercial_airport",
  "rail_station",
  "mountain",
  "park",
  "museum",
] as const satisfies readonly MeasuringLocationCategory[];

const PRELOAD_LINEAR_KINDS = ["international_border", "admin2_border"] as const;

export function gameAreaPreloadKey(gameArea: GameArea): string {
  return JSON.stringify(gameArea.coordinates);
}

function buildPreloadJobs(
  gameArea: GameArea,
): Array<() => Promise<unknown>> {
  const jobs: Array<() => Promise<unknown>> = [
    () => fetchPreparedCoastlineSegments(gameArea),
    () => fetchLandmassFeaturesInArea(gameArea),
    () => fetchStaticTransit(gameArea),
  ];

  for (const adminLevel of PRELOAD_ADMIN_LEVELS) {
    jobs.push(() => fetchAdminDivisionFeaturesInArea(gameArea, adminLevel));
  }

  for (const category of PRELOAD_MEASURING_CATEGORIES) {
    jobs.push(() => fetchMeasuringPlacesInArea(gameArea, category));
  }

  for (const kind of PRELOAD_LINEAR_KINDS) {
    jobs.push(() => fetchPreparedMeasuringLinearSegments(gameArea, kind));
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
      await sleep(PRELOAD_JOB_GAP_MS);
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

export function preloadGameAreaCaches(gameArea: GameArea): void {
  const gameAreaKey = gameAreaPreloadKey(gameArea);
  const jobs = buildPreloadJobs(gameArea);
  usePreloadStore.getState().reset(gameAreaKey, jobs.length);

  activePreloadAbort?.abort();
  activePreloadAbort = new AbortController();
  const { signal } = activePreloadAbort;

  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return;
  }

  void runPreloadQueue(gameAreaKey, jobs, signal);
}

export async function preloadCriticalGameAreaCaches(
  gameArea: GameArea,
): Promise<void> {
  await Promise.allSettled([
    fetchPreparedCoastlineSegments(gameArea),
    fetchLandmassFeaturesInArea(gameArea),
    ...PRELOAD_ADMIN_LEVELS.map((adminLevel) =>
      fetchAdminDivisionFeaturesInArea(gameArea, adminLevel),
    ),
  ]);
}

export function preloadJobGapMsForTests(): number {
  return PRELOAD_JOB_GAP_MS;
}
