import type { PreparedLinearSegments } from "@/domain/geometry/measuring/geometryMeasuring";
import type { ElevationSampleCell } from "@/domain/geometry/measuring/seaLevel";
import type { GameArea } from "@/domain/map/annotations";
import type { LoadPriority, ProgressNode, StageSpec } from "@/domain/progress/progressTree";
import { abortReason, throwIfAborted } from "../../core/network/anySignal";
import { configureDurationHistoryStore } from "../../core/progress/durationHistory";
import { createDetachedProgressRoot } from "../../core/progress/loadTask";
import {
  clearPersistedCacheForTests,
  readPersistedEntry,
  readPersistedEntryIgnoringExpiry,
  writePersistedEntry,
} from "./indexedDb";
import {
  coastlineSegmentsCacheKey,
  PROGRESS_HISTORY_CACHE_KEY,
  seaLevelSamplingCacheKey,
} from "./keys";
import {
  type InFlightEntry,
  inFlight,
  memoryCache,
  readCachedMemoryEntry,
  staleServedKeys,
  writeMemoryEntry,
} from "./memory";

export {
  adminDivisionCacheKey,
  coastlineSegmentsCacheKey,
  geographicCacheKey,
  landmassCacheKey,
  linearSegmentsCacheKey,
  measuringPlacesCacheKey,
  seaLevelSamplingCacheKey,
  staticTransitCacheKey,
  tentaclePoisCacheKey,
} from "./keys";
export type { GeoCacheLayer } from "./memory";
export {
  clearStaleCacheNoticesForTests,
  memoryGeoCache,
  readCachedMemoryEntry,
  staleCacheCaptionForKey,
} from "./memory";

interface CacheOptions {
  persistEmpty?: boolean;
}

export interface FetchContext {
  /** Aborts only when every cancellable subscriber has cancelled. */
  signal: AbortSignal;
  /** Highest priority among live subscribers, read live. */
  priority: () => LoadPriority;
  /** Shared progress stage; every subscriber's own stage mirrors it. */
  node: ProgressNode;
}

export interface CachedFetchOptions extends CacheOptions {
  /** This caller's cancel; other callers of the same key keep the fetch alive. */
  signal?: AbortSignal;
  /** A getter is read live, so a nested fetch follows its parent's promotion. */
  priority?: LoadPriority | (() => LoadPriority);
  /** This caller's stage; mirrors the shared fetch, or finishes at once on a cache hit. */
  node?: ProgressNode;
  /** Spec of the shared fetch stage (history key, size bucket). */
  stage?: StageSpec;
}

async function writeCachedValue<T>(
  key: string,
  value: T,
  options: CacheOptions = {},
): Promise<void> {
  const persistEmpty = options.persistEmpty ?? true;
  writeMemoryEntry(key, value);

  if (!persistEmpty && Array.isArray(value) && (value as unknown[]).length === 0) {
    return;
  }

  await writePersistedEntry(key, value);
}

const priorityListeners = new Set<() => void>();

/**
 * Lets a request scheduler re-check its lanes when a shared fetch's subscribers
 * change. Keeps this generic cache free of any one scheduler.
 */
export function onSharedFetchPriorityChange(listener: () => void): () => void {
  priorityListeners.add(listener);
  return () => {
    priorityListeners.delete(listener);
  };
}

function notifyPriorityChange(): void {
  for (const listener of priorityListeners) {
    listener();
  }
}

configureDurationHistoryStore({
  read: () => readPersistedEntryIgnoringExpiry(PROGRESS_HISTORY_CACHE_KEY),
  write: (blob) => writePersistedEntry(PROGRESS_HISTORY_CACHE_KEY, blob),
});

/** How long a fetch with no remaining subscribers keeps running before it is aborted. */
export const ABANDON_GRACE_MS = 1_500;

const DEFAULT_FETCH_STAGE: StageSpec = {
  kind: "fetch",
  label: "Loading map data",
  historyKey: "fetch:cached",
};

function entryPriority(entry: InFlightEntry): LoadPriority {
  for (const priority of entry.priorities) {
    if (priority() === "foreground") {
      return "foreground";
    }
  }
  return "background";
}

function startInFlight<T>(
  key: string,
  fetcher: (context: FetchContext) => Promise<T>,
  options: CachedFetchOptions,
): InFlightEntry {
  const controller = new AbortController();
  const spec = options.stage ?? DEFAULT_FETCH_STAGE;
  const node = createDetachedProgressRoot(spec.label).stage(spec);
  const entry: InFlightEntry = {
    promise: Promise.resolve(),
    controller,
    node,
    cancellable: 0,
    pinned: false,
    priorities: new Set(),
    settled: false,
    abandonTimer: null,
  };

  entry.promise = (async () => {
    const persisted = await readPersistedEntry<T>(key);
    if (persisted !== undefined) {
      node.finish();
      return persisted;
    }

    try {
      const value = await fetcher({
        signal: controller.signal,
        priority: () => entryPriority(entry),
        node,
      });
      node.finish();
      staleServedKeys.delete(key);
      await writeCachedValue(key, value, options);
      return value;
    } catch (error) {
      // A cancelled fetch is neither cached nor papered over with stale data.
      if (controller.signal.aborted) {
        node.cancel();
        throw error;
      }
      const stale = await readPersistedEntryIgnoringExpiry<T>(key);
      if (stale !== undefined) {
        staleServedKeys.add(key);
        // A failed fetch rescued by stale data is not a duration worth learning from.
        node.cancel();
        return stale;
      }

      node.cancel();
      throw error;
    }
  })().finally(() => {
    entry.settled = true;
    if (entry.abandonTimer !== null) {
      clearTimeout(entry.abandonTimer);
      entry.abandonTimer = null;
    }
    if (inFlight.get(key) === entry) {
      inFlight.delete(key);
    }
  });

  return entry;
}

function subscribe<T>(key: string, entry: InFlightEntry, options: CachedFetchOptions): Promise<T> {
  const { signal } = options;
  const requested = options.priority ?? "foreground";
  // A fresh closure per subscription, so two subscribers sharing a getter stay distinct.
  const priorityOf = (): LoadPriority =>
    typeof requested === "function" ? requested() : requested;
  entry.priorities.add(priorityOf);
  if (signal) {
    entry.cancellable += 1;
  } else {
    entry.pinned = true;
  }
  if (entry.abandonTimer !== null) {
    clearTimeout(entry.abandonTimer);
    entry.abandonTimer = null;
  }
  options.node?.mirror(entry.node);
  notifyPriorityChange();

  let attached = true;
  const detach = (): void => {
    if (!attached) {
      return;
    }
    attached = false;
    entry.priorities.delete(priorityOf);
    if (signal) {
      entry.cancellable -= 1;
    }
    const abandoned = () =>
      entry.cancellable === 0 &&
      !entry.pinned &&
      !entry.settled &&
      !entry.controller.signal.aborted;
    // A superseded request is usually followed at once by a new one for the same
    // key (same play area, new anchor). Waiting briefly lets it rejoin instead of
    // restarting the fetch, which could otherwise never finish under GPS jitter.
    if (abandoned() && entry.abandonTimer === null) {
      const reason = signal ? abortReason(signal) : undefined;
      entry.abandonTimer = setTimeout(() => {
        entry.abandonTimer = null;
        if (!abandoned()) {
          return;
        }
        if (inFlight.get(key) === entry) {
          inFlight.delete(key);
        }
        entry.controller.abort(reason);
      }, ABANDON_GRACE_MS);
    }
    notifyPriorityChange();
  };

  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      detach();
      reject(abortReason(signal));
      return;
    }
    const onAbort = () => {
      detach();
      options.node?.cancel();
      reject(abortReason(signal as AbortSignal));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    entry.promise.then(
      (value) => {
        signal?.removeEventListener("abort", onAbort);
        if (attached) {
          detach();
          options.node?.finish();
          resolve(value as T);
        }
      },
      (error: unknown) => {
        signal?.removeEventListener("abort", onAbort);
        if (attached) {
          detach();
          reject(error);
        }
      },
    );
  });
}

export async function getOrFetchCached<T>(
  key: string,
  fetcher: (context: FetchContext) => Promise<T>,
  options: CachedFetchOptions = {},
): Promise<T> {
  throwIfAborted(options.signal);
  const memoryValue = readCachedMemoryEntry<T>(key);
  if (memoryValue !== undefined) {
    options.node?.finish();
    return memoryValue;
  }

  let entry = inFlight.get(key);
  if (!entry) {
    entry = startInFlight(key, fetcher, options);
    inFlight.set(key, entry);
  }
  return subscribe<T>(key, entry, options);
}

export interface CachedSeaLevelSampling {
  cells: ElevationSampleCell[];
  cellElevations: number[];
  divisions: number;
  complete: boolean;
}

export function readSeaLevelSamplingCache(gameArea: GameArea): CachedSeaLevelSampling | undefined {
  return readCachedMemoryEntry<CachedSeaLevelSampling>(seaLevelSamplingCacheKey(gameArea));
}

export async function readSeaLevelSamplingCacheAsync(
  gameArea: GameArea,
): Promise<CachedSeaLevelSampling | undefined> {
  const memoryValue = readSeaLevelSamplingCache(gameArea);
  if (memoryValue !== undefined) {
    return memoryValue;
  }

  return readPersistedEntry<CachedSeaLevelSampling>(seaLevelSamplingCacheKey(gameArea));
}

export async function writeSeaLevelSamplingCache(
  gameArea: GameArea,
  value: CachedSeaLevelSampling,
): Promise<void> {
  await writeCachedValue(seaLevelSamplingCacheKey(gameArea), value);
}

export async function writeCoastlineSegmentsCache(
  gameArea: GameArea,
  value: PreparedLinearSegments,
): Promise<void> {
  await writeCachedValue(coastlineSegmentsCacheKey(gameArea), value);
}

export async function clearGeographicFeatureCacheForTests(): Promise<void> {
  memoryCache.clear();
  inFlight.clear();
  staleServedKeys.clear();
  await clearPersistedCacheForTests();
}
