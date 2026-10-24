import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import {
  buildSeaLevelNearRegionFromSamples,
  buildSeaLevelNearRegionWithLocalRefine,
  distanceFromSeaLevelMeters,
  type ElevationSampleCell,
  MAX_SEA_LEVEL_REFINE_SAMPLES,
  SEA_LEVEL_REFINE_SUBDIVISIONS,
  type SeaLevelEdgeCase,
  selectAmbiguousSeaLevelCells,
  subdivideElevationSampleCell,
} from "@/domain/geometry/measuring/seaLevel";
import type { GameArea } from "@/domain/map/annotations";
import type { ProgressNode, StageSpec } from "@/domain/progress/progressTree";
import type { LoadTask } from "@/services/core/progress/loadTask";
import { yieldToMain } from "@/services/core/progress/yieldToMain";
import type { CachedSeaLevelSampling } from "../cache";
import { fetchElevations } from "./index";
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
  task?: LoadTask;
}

const SEEKER_ELEVATION_STAGE: StageSpec = {
  kind: "fetch",
  label: "Reading your elevation",
  historyKey: "elevation:seeker",
};
const SAMPLING_STAGE: StageSpec = {
  kind: "fetch",
  label: "Sampling elevation across the play area",
  historyKey: "elevation:sampling",
};
const REFINE_STAGE: StageSpec = {
  kind: "fetch",
  label: "Refining near your position",
  historyKey: "elevation:refine",
};
const SHADE_STAGE: StageSpec = {
  kind: "compute",
  label: "Shading the play area",
  historyKey: "compute:shade",
};

interface SeaLevelStages {
  signal?: AbortSignal;
  refine?: ProgressNode;
  shade?: ProgressNode;
}

export function buildSeaLevelContextFromSampling(
  seekerElevationMeters: number,
  sampling: CachedSeaLevelSampling,
  gameArea: GameArea,
): SeaLevelContext | SeaLevelContextFailure {
  const distanceFromSeaLevel = distanceFromSeaLevelMeters(seekerElevationMeters);
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

async function shadeStage<T>(stages: SeaLevelStages, build: () => T): Promise<T> {
  stages.refine?.finish();
  stages.shade?.start();
  if (stages.shade) {
    await yieldToMain();
  }
  const result = build();
  stages.shade?.finish();
  return result;
}

async function refineSeaLevelContextLocally(
  seekerElevationMeters: number,
  sampling: CachedSeaLevelSampling,
  gameArea: GameArea,
  stages: SeaLevelStages = {},
): Promise<SeaLevelContext | SeaLevelContextFailure> {
  const distanceFromSeaLevel = distanceFromSeaLevelMeters(seekerElevationMeters);
  const ambiguous = selectAmbiguousSeaLevelCells(
    sampling.cells,
    sampling.cellElevations,
    distanceFromSeaLevel,
  );

  if (ambiguous.length === 0) {
    return shadeStage(stages, () =>
      buildSeaLevelContextFromSampling(seekerElevationMeters, sampling, gameArea),
    );
  }

  const refineEntries = ambiguous.flatMap((parent) => {
    const parentKey = `${parent.row}:${parent.col}`;
    return subdivideElevationSampleCell(parent, SEA_LEVEL_REFINE_SUBDIVISIONS).map((cell) => ({
      cell,
      parentKey,
    }));
  });
  const capped = refineEntries.slice(0, MAX_SEA_LEVEL_REFINE_SAMPLES);
  const refineCells = capped.map((entry) => entry.cell);
  const refineParentKeys = capped.map((entry) => entry.parentKey);

  stages.refine?.start();
  const refineElevations = await fetchElevations(
    refineCells.map((cell) => cell.point),
    { profile: "foreground", signal: stages.signal },
  );

  const { region: nearRegion, edgeCase } = await shadeStage(stages, () =>
    buildSeaLevelNearRegionWithLocalRefine({
      cells: sampling.cells,
      elevations: sampling.cellElevations,
      seekerDistanceFromSeaLevelMeters: distanceFromSeaLevel,
      gameArea,
      refineCells,
      refineParentKeys,
      refineElevations,
    }),
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
  options?: LoadSeaLevelContextOptions,
): Promise<SeaLevelContext | SeaLevelContextFailure | null> {
  const task = options?.task;
  const signal = task?.signal;
  const seekerStage = task?.stage(SEEKER_ELEVATION_STAGE);
  const samplingStage = task?.stage(SAMPLING_STAGE);
  const stages: SeaLevelStages = {
    signal,
    refine: task?.stage(REFINE_STAGE),
    shade: task?.stage(SHADE_STAGE),
  };

  seekerStage?.start();
  const elevations = await fetchElevations([seeker], { profile: "foreground", signal });
  seekerStage?.finish();
  const seekerElevationMeters = elevations[0];

  if (!Number.isFinite(seekerElevationMeters)) {
    return null;
  }

  samplingStage?.start();
  const sampling = await ensureSeaLevelSamplingComplete(gameArea, {
    node: samplingStage,
    signal,
    regionPackId: options?.regionPackId,
    onEnrich: options?.onEnrich
      ? (enriched) => {
          options.onEnrich?.(
            buildSeaLevelContextFromSampling(seekerElevationMeters, enriched, gameArea),
          );
        }
      : undefined,
  });

  samplingStage?.finish();

  if (sampling.complete === true && options?.regionPackId) {
    return shadeStage(stages, () =>
      buildSeaLevelContextFromSampling(seekerElevationMeters, sampling, gameArea),
    );
  }

  return refineSeaLevelContextLocally(seekerElevationMeters, sampling, gameArea, stages);
}

export type { CachedSeaLevelSampling };
