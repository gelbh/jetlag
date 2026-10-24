import {
  type ElevationSampleCell,
  resolveCoarseSeaLevelDivisions,
  resolveFineSeaLevelDivisions,
  sampleGameAreaCells,
} from "@/domain/geometry/measuring/seaLevel";
import type { GameArea } from "@/domain/map/annotations";
import type { ProgressNode } from "@/domain/progress/progressTree";
import type { RegionPackId } from "@/domain/regions/regionPack";
import { abortReason, throwIfAborted } from "@/services/core/network/anySignal";
import { gameAreaPreloadKey } from "../../session/gameAreaPreload";
import {
  type CachedSeaLevelSampling,
  readSeaLevelSamplingCache,
  readSeaLevelSamplingCacheAsync,
  writeSeaLevelSamplingCache,
} from "../cache";
import { type ElevationFetchProfile, fetchElevations } from "./index";
import { requestGapMsForBatchSize } from "./rateLimit";
import {
  loadBundledSeaLevelSeed,
  remapBundledSeaLevelSeedToGameArea,
} from "./regionPackSeaLevelSeed";

export interface SeaLevelSamplingOptions {
  regionPackId?: RegionPackId;
  onEnrich?: (sampling: CachedSeaLevelSampling) => void;
  /** Counted stage for the foreground wait (crawl follow or direct fine fetch). */
  node?: ProgressNode;
  signal?: AbortSignal;
}

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

interface CrawlProgress {
  done: number;
  total: number;
}

/** Cells fetched by the running crawl for a game area, across coarse and fine phases. */
const crawlProgress = new Map<string, CrawlProgress>();
const crawlListeners = new Map<string, Set<(progress: CrawlProgress) => void>>();
/** Foreground waiters per game area; while any are attached the crawl skips its politeness gaps. */
const crawlPromotions = new Map<string, number>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isCrawlPromoted(gameAreaKey: string): boolean {
  return (crawlPromotions.get(gameAreaKey) ?? 0) > 0;
}

function emitCrawlProgress(gameAreaKey: string, progress: CrawlProgress): void {
  crawlProgress.set(gameAreaKey, progress);
  for (const listener of crawlListeners.get(gameAreaKey) ?? []) {
    listener(progress);
  }
}

/** Items per millisecond the elevation rate limit allows for sampling batches. */
export function seaLevelSamplingRatePerMs(): number {
  return SAMPLING_BATCH_SIZE / requestGapMsForBatchSize(SAMPLING_BATCH_SIZE);
}

/**
 * Follows a running background crawl: reports its cell count to `node` and
 * promotes it to foreground pacing until the returned detach is called.
 * Detaching never aborts the crawl; it also fills the cache for later questions.
 */
export function followSeaLevelCrawl(gameArea: GameArea, node?: ProgressNode): () => void {
  const gameAreaKey = gameAreaPreloadKey(gameArea);
  crawlPromotions.set(gameAreaKey, (crawlPromotions.get(gameAreaKey) ?? 0) + 1);
  const listener = (progress: CrawlProgress) => node?.setCount(progress.done, progress.total);
  const listeners = crawlListeners.get(gameAreaKey) ?? new Set();
  listeners.add(listener);
  crawlListeners.set(gameAreaKey, listeners);
  const current = crawlProgress.get(gameAreaKey);
  if (current) {
    listener(current);
  }

  let attached = true;
  return () => {
    if (!attached) {
      return;
    }
    attached = false;
    listeners.delete(listener);
    crawlPromotions.set(gameAreaKey, Math.max(0, (crawlPromotions.get(gameAreaKey) ?? 1) - 1));
  };
}

function countFiniteElevations(elevations: number[]): number {
  return elevations.filter((value) => Number.isFinite(value)).length;
}

function isDenseCompleteSampling(sampling: CachedSeaLevelSampling, gameArea: GameArea): boolean {
  if (sampling.complete !== true) {
    return false;
  }
  if (countFiniteElevations(sampling.cellElevations) !== sampling.cells.length) {
    return false;
  }
  const fineDivisions = resolveFineSeaLevelDivisions(gameArea);
  return sampling.divisions >= fineDivisions;
}

function setSamplerPhase(gameAreaKey: string, phase: SeaLevelSamplingPhase): void {
  samplerPhase.set(gameAreaKey, phase);
}

export function getSeaLevelSamplingProgress(gameArea: GameArea): SeaLevelSamplingProgress {
  const gameAreaKey = gameAreaPreloadKey(gameArea);
  const cached = readSeaLevelSamplingCache(gameArea);
  const targetCells = sampleGameAreaCells(gameArea, resolveFineSeaLevelDivisions(gameArea)).length;
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
  pacing: { gameAreaKey: string; signal?: AbortSignal; onCount?: (done: number) => void },
): Promise<number[]> {
  const cellElevations = new Array<number>(cells.length).fill(Number.NaN);

  for (let index = 0; index < cells.length; index += SAMPLING_BATCH_SIZE) {
    const batchEnd = Math.min(index + SAMPLING_BATCH_SIZE, cells.length);
    const batchPoints = cells.slice(index, batchEnd).map((cell) => cell.point);
    const batchElevations = await fetchElevations(batchPoints, {
      profile,
      signal: pacing.signal,
    });

    for (let batchIndex = 0; batchIndex < batchElevations.length; batchIndex += 1) {
      cellElevations[index + batchIndex] = batchElevations[batchIndex];
    }

    await onBatchComplete([...cellElevations]);
    pacing.onCount?.(batchEnd);

    if (
      profile === "background" &&
      batchEnd < cells.length &&
      !isCrawlPromoted(pacing.gameAreaKey)
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
  progress: { signal?: AbortSignal; onCount?: (done: number, total: number) => void } = {},
): Promise<CachedSeaLevelSampling> {
  const cells = sampleGameAreaCells(gameArea, divisions);

  const cellElevations = await fetchSamplingElevations(
    cells,
    profile,
    async (partialElevations) => {
      await persistSampling(gameArea, cells, partialElevations, divisions, false);
    },
    {
      gameAreaKey: gameAreaPreloadKey(gameArea),
      signal: progress.signal,
      onCount: (done) => progress.onCount?.(done, cells.length),
    },
  );

  const sampling: CachedSeaLevelSampling = {
    cells,
    cellElevations,
    divisions,
    complete: completeWhenDone,
  };

  await persistSampling(gameArea, cells, cellElevations, divisions, completeWhenDone);

  return sampling;
}

async function runProgressiveSampling(gameArea: GameArea): Promise<void> {
  const gameAreaKey = gameAreaPreloadKey(gameArea);
  const coarseDivisions = resolveCoarseSeaLevelDivisions();
  const fineDivisions = resolveFineSeaLevelDivisions(gameArea);

  const coarseCells = sampleGameAreaCells(gameArea, coarseDivisions).length;
  const fineCells =
    fineDivisions > coarseDivisions ? sampleGameAreaCells(gameArea, fineDivisions).length : 0;
  const total = coarseCells + fineCells;

  setSamplerPhase(gameAreaKey, "coarse");
  emitCrawlProgress(gameAreaKey, { done: 0, total });
  await fetchAndPersistSampling(
    gameArea,
    coarseDivisions,
    "background",
    fineDivisions <= coarseDivisions,
    { onCount: (done) => emitCrawlProgress(gameAreaKey, { done, total }) },
  );

  if (fineDivisions <= coarseDivisions) {
    setSamplerPhase(gameAreaKey, "complete");
    return;
  }

  if (!isCrawlPromoted(gameAreaKey)) {
    await sleep(BACKGROUND_PHASE_GAP_MS);
  }
  setSamplerPhase(gameAreaKey, "fine");
  await fetchAndPersistSampling(gameArea, fineDivisions, "background", true, {
    onCount: (done) => emitCrawlProgress(gameAreaKey, { done: coarseCells + done, total }),
  });
  setSamplerPhase(gameAreaKey, "complete");
}

async function hydratePackSeaLevelSeed(
  gameArea: GameArea,
  regionPackId?: RegionPackId,
): Promise<CachedSeaLevelSampling | null> {
  if (!regionPackId) {
    return null;
  }

  const existing = readSeaLevelSamplingCache(gameArea);
  if (existing && countFiniteElevations(existing.cellElevations) > 0) {
    return existing;
  }

  const seed = await loadBundledSeaLevelSeed(regionPackId);
  if (!seed) {
    return null;
  }

  const sampling = remapBundledSeaLevelSeedToGameArea(seed, gameArea);
  if (!sampling) {
    return null;
  }

  await writeSeaLevelSamplingCache(gameArea, sampling);
  return sampling;
}

export function startSeaLevelBackgroundSampling(
  gameArea: GameArea,
  options?: SeaLevelSamplingOptions,
): void {
  const gameAreaKey = gameAreaPreloadKey(gameArea);
  const cached = readSeaLevelSamplingCache(gameArea);
  if (cached && isDenseCompleteSampling(cached, gameArea)) {
    setSamplerPhase(gameAreaKey, "complete");
    return;
  }

  if (activeSamplers.has(gameAreaKey)) {
    return;
  }

  const job = (async () => {
    const seeded = await hydratePackSeaLevelSeed(gameArea, options?.regionPackId);
    if (seeded && isDenseCompleteSampling(seeded, gameArea)) {
      setSamplerPhase(gameAreaKey, "complete");
      return;
    }
    await runProgressiveSampling(gameArea);
  })().finally(() => {
    activeSamplers.delete(gameAreaKey);
    crawlProgress.delete(gameAreaKey);
  });
  activeSamplers.set(gameAreaKey, job);
  void job.catch(() => {
    setSamplerPhase(gameAreaKey, "idle");
  });
}

export async function ensureSeaLevelSamplingComplete(
  gameArea: GameArea,
  options?: SeaLevelSamplingOptions,
): Promise<CachedSeaLevelSampling> {
  const seeded = await hydratePackSeaLevelSeed(gameArea, options?.regionPackId);

  if (seeded && isDenseCompleteSampling(seeded, gameArea)) {
    setSamplerPhase(gameAreaPreloadKey(gameArea), "complete");
    return seeded;
  }

  startSeaLevelBackgroundSampling(gameArea, {
    regionPackId: options?.regionPackId,
  });

  if (seeded && options?.onEnrich && countFiniteElevations(seeded.cellElevations) > 0) {
    const gameAreaKey = gameAreaPreloadKey(gameArea);
    const activeJob = activeSamplers.get(gameAreaKey);
    if (activeJob) {
      void activeJob
        .then(async () => {
          const fine = await readSeaLevelSamplingCacheAsync(gameArea);
          if (
            fine &&
            fine.complete === true &&
            countFiniteElevations(fine.cellElevations) === fine.cells.length
          ) {
            options.onEnrich?.(fine);
          }
        })
        .catch(() => {});
    }
    return seeded;
  }

  const gameAreaKey = gameAreaPreloadKey(gameArea);
  const activeJob = activeSamplers.get(gameAreaKey);
  options?.node?.seedRate(seaLevelSamplingRatePerMs());
  if (activeJob) {
    const detach = followSeaLevelCrawl(gameArea, options?.node);
    try {
      await raceAbort(
        activeJob.catch(() => undefined),
        options?.signal,
      );
    } finally {
      detach();
    }
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

  return fetchAndPersistSampling(gameArea, fineDivisions, "foreground", true, {
    signal: options?.signal,
    onCount: (done, total) => options?.node?.setCount(done, total),
  });
}

/** Resolves with `promise`, or rejects with the abort reason when `signal` aborts first. */
function raceAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return promise;
  }
  throwIfAborted(signal);
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortReason(signal));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

export function clearSeaLevelProgressiveStateForTests(): void {
  activeSamplers.clear();
  samplerPhase.clear();
  crawlProgress.clear();
  crawlListeners.clear();
  crawlPromotions.clear();
}
