import type { GameArea } from "../domain/annotations";
import type { MeasuringLocationCategory } from "../domain/measuringQuestions";
import { fetchAdminDivisionFeaturesInArea } from "./adminDivisionBoundaries";
import { fetchPreparedCoastlineSegments } from "./coastline";
import { fetchLandmassFeaturesInArea } from "./landmassFeatures";
import { fetchMeasuringPlacesInArea } from "./measuringPlaces";
import { fetchPreparedMeasuringLinearSegments } from "./measuringLinearFeatures";
import { prefetchSeaLevelSampling } from "./seaLevel";
import { fetchStaticTransit } from "./transitStatic";
import { usePreloadStore } from "../state/preloadStore";

const PRELOAD_ADMIN_LEVELS = [4, 6, 8] as const;

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
    async () => {
      prefetchSeaLevelSampling(gameArea);
    },
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

function runTrackedPreloadJob(
  gameAreaKey: string,
  task: () => Promise<unknown>,
): void {
  void task()
    .then(() => {
      usePreloadStore.getState().recordSuccess(gameAreaKey);
    })
    .catch(() => {
      usePreloadStore.getState().recordFailure(gameAreaKey);
    });
}

export function preloadGameAreaCaches(gameArea: GameArea): void {
  const gameAreaKey = gameAreaPreloadKey(gameArea);
  const jobs = buildPreloadJobs(gameArea);
  usePreloadStore.getState().reset(gameAreaKey, jobs.length);

  for (const job of jobs) {
    runTrackedPreloadJob(gameAreaKey, job);
  }
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
