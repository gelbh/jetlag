import type { GameArea } from "../domain/annotations";
import {
  buildSeaLevelNearRegionFromSamples,
  distanceFromSeaLevelMeters,
  sampleGameAreaCells,
  type ElevationSampleCell,
  type SeaLevelEdgeCase,
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
  edgeCase: SeaLevelEdgeCase | null;
}

export type SeaLevelContextFailureReason = "lowest" | "build_failed";

export interface SeaLevelContextFailure {
  reason: SeaLevelContextFailureReason;
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
): Promise<SeaLevelContext | SeaLevelContextFailure | null> {
  const sampling = await loadSeaLevelSampling(gameArea);
  const elevations = await fetchElevations([seeker]);
  const seekerElevationMeters = elevations[0];

  if (!Number.isFinite(seekerElevationMeters)) {
    return null;
  }

  const distanceFromSeaLevel = distanceFromSeaLevelMeters(
    seekerElevationMeters,
  );
  const { region: nearRegion, edgeCase } = buildSeaLevelNearRegionFromSamples(
    sampling.cells,
    sampling.cellElevations,
    distanceFromSeaLevel,
    gameArea,
  );

  if (edgeCase === "lowest" || !nearRegion) {
    return { reason: "lowest" };
  }

  return {
    seekerElevationMeters,
    distanceFromSeaLevelMeters: distanceFromSeaLevel,
    nearRegion,
    cells: sampling.cells,
    cellElevations: sampling.cellElevations,
    edgeCase,
  };
}
