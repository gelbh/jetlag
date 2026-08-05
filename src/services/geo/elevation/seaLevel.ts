import type { GameArea } from "@/domain/map/annotations";
import {
  buildSeaLevelNearRegionFromSamples,
  distanceFromSeaLevelMeters,
  type ElevationSampleCell,
  type SeaLevelEdgeCase,
} from "@/domain/geometry/measuring/seaLevel";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { fetchElevations } from "./index";
import type { CachedSeaLevelSampling } from "../cache";
import {
  ensureSeaLevelSamplingComplete,
  type SeaLevelSamplingOptions,
} from "./seaLevelProgressive";

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

function buildContextFromSampling(
  seekerElevationMeters: number,
  sampling: CachedSeaLevelSampling,
  gameArea: GameArea,
): SeaLevelContext | SeaLevelContextFailure {
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

export async function loadSeaLevelContext(
  seeker: LatLngTuple,
  gameArea: GameArea,
  options?: SeaLevelSamplingOptions,
): Promise<SeaLevelContext | SeaLevelContextFailure | null> {
  const sampling = await ensureSeaLevelSamplingComplete(gameArea, {
    regionPackId: options?.regionPackId,
    onEnrich: options?.onEnrich
      ? (enriched) => {
          options.onEnrich?.(enriched);
        }
      : undefined,
  });
  const elevations = await fetchElevations([seeker], { profile: "foreground" });
  const seekerElevationMeters = elevations[0];

  if (!Number.isFinite(seekerElevationMeters)) {
    return null;
  }

  return buildContextFromSampling(
    seekerElevationMeters,
    sampling,
    gameArea,
  );
}

export type { CachedSeaLevelSampling };
