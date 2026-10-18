import type { ProgressNode, StageSpec } from "@/domain/progress/progressTree";
import { queryOverpass } from "../../core/overpass/overpassClient";
import { type LoadTask, runLoadTask } from "../../core/progress/loadTask";
import type { CachedFetchOptions, FetchContext } from "../cache";
import {
  type OverpassBbox,
  overpassBboxSizeBucket,
  queryOverpassWithBboxSplit,
} from "./overpassBboxSplit";
import type { SlotRequest } from "./requestQueue";

/**
 * Cancel, lane and progress for one Overpass-backed load. Every field is
 * optional; without them a call behaves exactly as before.
 */
export interface OverpassLoad {
  signal?: AbortSignal;
  priority?: SlotRequest["priority"];
  /** Stage this load drives (queued, split, finished). */
  node?: ProgressNode;
}

export function overpassLoadFromTask(task: LoadTask | undefined, spec: StageSpec): OverpassLoad {
  if (!task) {
    return {};
  }
  return { signal: task.signal, priority: task.priority, node: task.stage(spec) };
}

/** Load for the fetcher of a shared `getOrFetchCached` entry. */
export function overpassLoadFromFetch(context: FetchContext): OverpassLoad {
  return { signal: context.signal, priority: context.priority, node: context.node };
}

/** `getOrFetchCached` options that make this caller follow, and be able to cancel, the shared fetch. */
export function cachedFetchOptions(
  load: OverpassLoad | undefined,
  stage: StageSpec,
  base: Pick<CachedFetchOptions, "persistEmpty"> = {},
): CachedFetchOptions {
  const priority = typeof load?.priority === "function" ? load.priority() : load?.priority;
  return { ...base, signal: load?.signal, priority, node: load?.node, stage };
}

export function queryOverpassLoaded<T>(query: string, load: OverpassLoad = {}): Promise<T> {
  return queryOverpass<T>(query, load);
}

export function queryOverpassSplitLoaded<T>(
  buildQuery: (bbox: OverpassBbox) => string,
  bbox: OverpassBbox,
  merge: (parts: T[]) => T,
  load: OverpassLoad = {},
): Promise<T> {
  return queryOverpassWithBboxSplit(
    buildQuery,
    bbox,
    (ql, node) => queryOverpass<T>(ql, { signal: load.signal, priority: load.priority, node }),
    merge,
    { signal: load.signal, node: load.node },
  );
}

/** Progress options shared by pack-then-Overpass loaders (matching, tentacle, measuring). */
export interface PackThenOverpassProgress {
  /** Foreground task; stages are added to its root. */
  task?: LoadTask;
  /** Creates the compact task shown while Overpass enriches a bundle result in the background. */
  createEnrichTask?: () => LoadTask;
}

export const BUNDLE_PLACES_STAGE: StageSpec = {
  kind: "fetch",
  label: "Loading bundled places",
  historyKey: "bundle:places",
};

export function overpassSearchStage(historyKey: string, bbox: OverpassBbox): StageSpec {
  return {
    kind: "fetch",
    label: "Searching map data",
    historyKey,
    sizeBucket: overpassBboxSizeBucket(bbox),
  };
}

/** Runs a soft-failing Overpass enrich under its own task; failures keep the bundle result. */
export function enrichInBackground<T>(
  createTask: (() => LoadTask) | undefined,
  spec: StageSpec,
  run: (load: OverpassLoad) => Promise<T>,
  onDone: (value: T) => void,
): void {
  const task = createTask?.();
  const load = overpassLoadFromTask(task, spec);
  const work = task ? runLoadTask(task, () => run(load)) : run(load);
  void work.then(onDone).catch(() => {
    // Soft-fail Overpass enrich; keep the bundle result.
  });
}

/** Wraps a bundled-pack read in a timed stage that finishes even when the pack is empty. */
export async function withBundleStage<T>(
  task: LoadTask | undefined,
  read: () => Promise<T>,
  spec: StageSpec = BUNDLE_PLACES_STAGE,
): Promise<T> {
  const node = task?.stage(spec);
  node?.start();
  try {
    return await read();
  } finally {
    node?.finish();
  }
}
