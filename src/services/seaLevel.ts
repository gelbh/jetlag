import type { GameArea } from "../domain/annotations";
import {
  buildSeaLevelNearRegionFromSamples,
  distanceFromSeaLevelMeters,
  sampleGameAreaCells,
  type ElevationSampleCell,
} from "../domain/seaLevel";
import type { LatLngTuple } from "../domain/geometry";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { fetchElevations } from "./elevation";
import {
  getOrFetchCached,
  seaLevelSamplingCacheKey,
  type CachedSeaLevelSampling,
} from "./geographicFeatureCache";

export interface SeaLevelContext {
  seekerElevationMeters: number;
  distanceFromSeaLevelMeters: number;
  nearRegion: Feature<Polygon | MultiPolygon>;
  cells: ElevationSampleCell[];
  cellElevations: number[];
}

export function prefetchSeaLevelSampling(gameArea: GameArea): void {
  void loadSeaLevelSampling(gameArea).catch(() => undefined);
}

async function loadSeaLevelSampling(
  gameArea: GameArea,
): Promise<CachedSeaLevelSampling> {
  return getOrFetchCached(seaLevelSamplingCacheKey(gameArea), async () => {
    const cells = sampleGameAreaCells(gameArea);
    const cellElevations = await fetchElevations(
      cells.map((cell) => cell.point),
    );

    return {
      cells,
      cellElevations,
    };
  });
}

export async function loadSeaLevelContext(
  seeker: LatLngTuple,
  gameArea: GameArea,
): Promise<SeaLevelContext | null> {
  const sampling = await loadSeaLevelSampling(gameArea);
  const elevations = await fetchElevations([seeker]);
  const seekerElevationMeters = elevations[0];
  const distanceFromSeaLevel = distanceFromSeaLevelMeters(
    seekerElevationMeters,
  );
  const nearRegion = buildSeaLevelNearRegionFromSamples(
    sampling.cells,
    sampling.cellElevations,
    distanceFromSeaLevel,
    gameArea,
  );

  if (!nearRegion) {
    return null;
  }

  return {
    seekerElevationMeters,
    distanceFromSeaLevelMeters: distanceFromSeaLevel,
    nearRegion,
    cells: sampling.cells,
    cellElevations: sampling.cellElevations,
  };
}
