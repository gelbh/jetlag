import type { GameArea } from "../domain/annotations";
import {
  buildSeaLevelNearRegionFromSamples,
  distanceFromSeaLevelMeters,
  type ElevationSampleCell,
  type SeaLevelEdgeCase,
} from "../domain/seaLevel";
import type { LatLngTuple } from "../domain/geometry";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { fetchElevations } from "./elevation";
import type { CachedSeaLevelSampling } from "./geographicFeatureCache";
import { ensureSeaLevelSamplingComplete } from "./seaLevelProgressive";

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

export async function loadSeaLevelContext(
  seeker: LatLngTuple,
  gameArea: GameArea,
): Promise<SeaLevelContext | SeaLevelContextFailure | null> {
  const sampling = await ensureSeaLevelSamplingComplete(gameArea);
  const elevations = await fetchElevations([seeker], { profile: "foreground" });
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
    sampling.divisions,
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

export type { CachedSeaLevelSampling };
