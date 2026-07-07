import type { GameArea } from "../../domain/map/annotations";
import {
  resolveCoarseSeaLevelDivisions,
  resolveFineSeaLevelDivisions,
  sampleGameAreaCells,
  type ElevationSampleCell,
} from "../../domain/geometry/seaLevel";
import { fetchElevations, type ElevationFetchProfile } from "./elevation";
import {
  readSeaLevelSamplingCache,
  readSeaLevelSamplingCacheAsync,
  writeSeaLevelSamplingCache,
  type CachedSeaLevelSampling,
} from "./geographicFeatureCache";
import { gameAreaPreloadKey } from "../session/gameAreaPreload";

const SAMPLING_BATCH_SIZE = 50;
const BACKGROUND_BATCH_GAP_MS = 400;
const BACKGROUND_PHASE_GAP_MS = 800;

export type SeaLevelSamplingPhase = "idle" | "coarse" | "fine" | "complete";

export interface SeaLevelSamplingProgress {
  completedCells: number;
  targetCells: number;
  phase: SeaLevelSamplingPhase;
}

const activeSamplers = new Map<string, Promise<void>>();
const samplerPhase = new Map<string, SeaLevelSamplingPhase>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function countFiniteElevations(elevations: number[]): number {
  return elevations.filter((value) => Number.isFinite(value)).length;
}

function setSamplerPhase(gameAreaKey: string, phase: SeaLevelSamplingPhase): void {
  samplerPhase.set(gameAreaKey, phase);
}

export function getSeaLevelSamplingProgress(
  gameArea: GameArea,
): SeaLevelSamplingProgress {
  const gameAreaKey = gameAreaPreloadKey(gameArea);
  const cached = readSeaLevelSamplingCache(gameArea);
  const targetCells = sampleGameAreaCells(
    gameArea,
    resolveFineSeaLevelDivisions(gameArea),
  ).length;
  const phase =
    samplerPhase.get(gameAreaKey) ??
    (cached?.complete === true ? "complete" : cached ? "fine" : "idle");

  return {
    completedCells: cached ? countFiniteElevations(cached.cellElevations) : 0,
    targetCells,
    phase,
  };
}

async function fetchSamplingElevations(
  cells: ElevationSampleCell[],
  profile: ElevationFetchProfile,
  onBatchComplete: (elevations: number[]) => Promise<void>,
): Promise<number[]> {
  const cellElevations = new Array<number>(cells.length).fill(Number.NaN);

  for (let index = 0; index < cells.length; index += SAMPLING_BATCH_SIZE) {
    const batchEnd = Math.min(index + SAMPLING_BATCH_SIZE, cells.length);
    const batchPoints = cells.slice(index, batchEnd).map((cell) => cell.point);
    const batchElevations = await fetchElevations(batchPoints, { profile });

    for (let batchIndex = 0; batchIndex < batchElevations.length; batchIndex += 1) {
      cellElevations[index + batchIndex] = batchElevations[batchIndex];
    }

    await onBatchComplete([...cellElevations]);

    if (
      profile === "background" &&
      batchEnd < cells.length
    ) {
      await sleep(BACKGROUND_BATCH_GAP_MS);
    }
  }

  return cellElevations;
}

async function persistSampling(
  gameArea: GameArea,
  cells: ElevationSampleCell[],
  cellElevations: number[],
  divisions: number,
  complete: boolean,
): Promise<void> {
  await writeSeaLevelSamplingCache(gameArea, {
    cells,
    cellElevations,
    divisions,
    complete,
  });
}

async function fetchAndPersistSampling(
  gameArea: GameArea,
  divisions: number,
  profile: ElevationFetchProfile,
  completeWhenDone: boolean,
): Promise<CachedSeaLevelSampling> {
  const cells = sampleGameAreaCells(gameArea, divisions);

  const cellElevations = await fetchSamplingElevations(
    cells,
    profile,
    async (partialElevations) => {
      await persistSampling(
        gameArea,
        cells,
        partialElevations,
        divisions,
        false,
      );
    },
  );

  const sampling: CachedSeaLevelSampling = {
    cells,
    cellElevations,
    divisions,
    complete: completeWhenDone,
  };

  await persistSampling(
    gameArea,
    cells,
    cellElevations,
    divisions,
    completeWhenDone,
  );

  return sampling;
}

async function runProgressiveSampling(gameArea: GameArea): Promise<void> {
  const gameAreaKey = gameAreaPreloadKey(gameArea);
  const coarseDivisions = resolveCoarseSeaLevelDivisions();
  const fineDivisions = resolveFineSeaLevelDivisions(gameArea);

  setSamplerPhase(gameAreaKey, "coarse");
  await fetchAndPersistSampling(
    gameArea,
    coarseDivisions,
    "background",
    fineDivisions <= coarseDivisions,
  );

  if (fineDivisions <= coarseDivisions) {
    setSamplerPhase(gameAreaKey, "complete");
    return;
  }

  await sleep(BACKGROUND_PHASE_GAP_MS);
  setSamplerPhase(gameAreaKey, "fine");
  await fetchAndPersistSampling(
    gameArea,
    fineDivisions,
    "background",
    true,
  );
  setSamplerPhase(gameAreaKey, "complete");
}

export function startSeaLevelBackgroundSampling(gameArea: GameArea): void {
  const gameAreaKey = gameAreaPreloadKey(gameArea);
  const cached = readSeaLevelSamplingCache(gameArea);
  if (cached?.complete === true) {
    setSamplerPhase(gameAreaKey, "complete");
    return;
  }

  if (activeSamplers.has(gameAreaKey)) {
    return;
  }

  const job = runProgressiveSampling(gameArea).finally(() => {
    activeSamplers.delete(gameAreaKey);
  });
  activeSamplers.set(gameAreaKey, job);
  void job.catch(() => {
    setSamplerPhase(gameAreaKey, "idle");
  });
}

export async function ensureSeaLevelSamplingComplete(
  gameArea: GameArea,
): Promise<CachedSeaLevelSampling> {
  startSeaLevelBackgroundSampling(gameArea);

  const gameAreaKey = gameAreaPreloadKey(gameArea);
  const activeJob = activeSamplers.get(gameAreaKey);
  if (activeJob) {
    await activeJob.catch(() => undefined);
  }

  const fineDivisions = resolveFineSeaLevelDivisions(gameArea);
  const cached = await readSeaLevelSamplingCacheAsync(gameArea);
  if (
    cached &&
    cached.complete === true &&
    typeof cached.divisions === "number" &&
    cached.divisions >= fineDivisions &&
    countFiniteElevations(cached.cellElevations) === cached.cells.length
  ) {
    return cached;
  }

  return fetchAndPersistSampling(gameArea, fineDivisions, "foreground", true);
}

export function clearSeaLevelProgressiveStateForTests(): void {
  activeSamplers.clear();
  samplerPhase.clear();
}
