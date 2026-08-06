import type { GameArea } from "@/domain/map/annotations";
import {
  buildSeaLevelNearRegionFromSamples,
  buildSeaLevelNearRegionWithLocalRefine,
  distanceFromSeaLevelMeters,
  MAX_SEA_LEVEL_REFINE_SAMPLES,
  SEA_LEVEL_REFINE_SUBDIVISIONS,
  selectAmbiguousSeaLevelCells,
  subdivideElevationSampleCell,
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

export interface LoadSeaLevelContextOptions {
  regionPackId?: SeaLevelSamplingOptions["regionPackId"];
  onEnrich?: (result: SeaLevelContext | SeaLevelContextFailure) => void;
}

export function buildSeaLevelContextFromSampling(
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

async function refineSeaLevelContextLocally(
  seekerElevationMeters: number,
  sampling: CachedSeaLevelSampling,
  gameArea: GameArea,
): Promise<SeaLevelContext | SeaLevelContextFailure> {
  const distanceFromSeaLevel = distanceFromSeaLevelMeters(
    seekerElevationMeters,
  );
  const ambiguous = selectAmbiguousSeaLevelCells(
    sampling.cells,
    sampling.cellElevations,
    distanceFromSeaLevel,
  );

  if (ambiguous.length === 0) {
    return buildSeaLevelContextFromSampling(
      seekerElevationMeters,
      sampling,
      gameArea,
    );
  }

  const refineCells = ambiguous
    .flatMap((cell) =>
      subdivideElevationSampleCell(cell, SEA_LEVEL_REFINE_SUBDIVISIONS),
    )
    .slice(0, MAX_SEA_LEVEL_REFINE_SAMPLES);

  const refineElevations = await fetchElevations(
    refineCells.map((cell) => cell.point),
    { profile: "foreground" },
  );

  const { region: nearRegion, edgeCase } =
    buildSeaLevelNearRegionWithLocalRefine({
      cells: sampling.cells,
      elevations: sampling.cellElevations,
      seekerDistanceFromSeaLevelMeters: distanceFromSeaLevel,
      gameArea,
      divisions: sampling.divisions,
      refineCells,
      refineElevations,
    });

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
  options?: LoadSeaLevelContextOptions,
): Promise<SeaLevelContext | SeaLevelContextFailure | null> {
  const elevations = await fetchElevations([seeker], { profile: "foreground" });
  const seekerElevationMeters = elevations[0];

  if (!Number.isFinite(seekerElevationMeters)) {
    return null;
  }

  const sampling = await ensureSeaLevelSamplingComplete(gameArea, {
    regionPackId: options?.regionPackId,
    onEnrich: options?.onEnrich
      ? (enriched) => {
          options.onEnrich?.(
            buildSeaLevelContextFromSampling(
              seekerElevationMeters,
              enriched,
              gameArea,
            ),
          );
        }
      : undefined,
  });

  // Dense complete pack seed: trust the grid. Freehand / incomplete: local refine.
  if (sampling.complete === true && options?.regionPackId) {
    return buildSeaLevelContextFromSampling(
      seekerElevationMeters,
      sampling,
      gameArea,
    );
  }

  return refineSeaLevelContextLocally(
    seekerElevationMeters,
    sampling,
    gameArea,
  );
}

export type { CachedSeaLevelSampling };
