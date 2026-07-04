import type { GameArea } from "../domain/annotations";
import type { MeasuringLocationCategory } from "../domain/measuringQuestions";
import { fetchAdminDivisionFeaturesInArea } from "./adminDivisionBoundaries";
import { fetchPreparedCoastlineSegments } from "./coastline";
import { fetchLandmassFeaturesInArea } from "./landmassFeatures";
import { fetchMeasuringPlacesInArea } from "./measuringPlaces";
import { fetchPreparedMeasuringLinearSegments } from "./measuringLinearFeatures";
import { prefetchSeaLevelSampling } from "./seaLevel";
import { fetchStaticTransit } from "./transitStatic";

const PRELOAD_ADMIN_LEVELS = [4, 6, 8] as const;

const PRELOAD_MEASURING_CATEGORIES = [
  "commercial_airport",
  "rail_station",
  "mountain",
  "park",
  "museum",
] as const satisfies readonly MeasuringLocationCategory[];

function preloadInBackground(task: Promise<unknown>): void {
  void task.catch(() => undefined);
}

export function preloadGameAreaCaches(gameArea: GameArea): void {
  preloadInBackground(fetchPreparedCoastlineSegments(gameArea));
  prefetchSeaLevelSampling(gameArea);

  for (const adminLevel of PRELOAD_ADMIN_LEVELS) {
    preloadInBackground(fetchAdminDivisionFeaturesInArea(gameArea, adminLevel));
  }

  preloadInBackground(fetchLandmassFeaturesInArea(gameArea));

  for (const category of PRELOAD_MEASURING_CATEGORIES) {
    preloadInBackground(fetchMeasuringPlacesInArea(gameArea, category));
  }

  preloadInBackground(
    fetchPreparedMeasuringLinearSegments(gameArea, "international_border"),
  );
  preloadInBackground(
    fetchPreparedMeasuringLinearSegments(gameArea, "admin2_border"),
  );

  preloadInBackground(fetchStaticTransit(gameArea));
}
