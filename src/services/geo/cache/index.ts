import type { GameArea } from "../../../domain/map/annotations";
import type { ElevationSampleCell } from "../../../domain/geometry/seaLevel";
import { clearPersistedCacheForTests, readPersistedEntry, readPersistedEntryIgnoringExpiry, writePersistedEntry } from "./indexedDb";
import {
  inFlight,
  memoryCache,
  readCachedMemoryEntry,
  staleServedKeys,
  writeMemoryEntry,
} from "./memory";
import { seaLevelSamplingCacheKey } from "./keys";

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
export {
  clearStaleCacheNoticesForTests,
  readCachedMemoryEntry,
  staleCacheCaptionForKey,
} from "./memory";

interface CacheOptions {
  persistEmpty?: boolean;
}

async function writeCachedValue<T>(
  key: string,
  value: T,
  options: CacheOptions = {},
): Promise<void> {
  const persistEmpty = options.persistEmpty ?? true;
  writeMemoryEntry(key, value);

  if (
    !persistEmpty &&
    Array.isArray(value) &&
    (value as unknown[]).length === 0
  ) {
    return;
  }

  await writePersistedEntry(key, value);
}

export async function getOrFetchCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T> {
  const memoryValue = readCachedMemoryEntry<T>(key);
  if (memoryValue !== undefined) {
    return memoryValue;
  }

  const existing = inFlight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const pending = (async () => {
    const persisted = await readPersistedEntry<T>(key);
    if (persisted !== undefined) {
      return persisted;
    }

    try {
      const value = await fetcher();
      staleServedKeys.delete(key);
      await writeCachedValue(key, value, options);
      return value;
    } catch (error) {
      const stale = await readPersistedEntryIgnoringExpiry<T>(key);
      if (stale !== undefined) {
        staleServedKeys.add(key);
        return stale;
      }

      throw error;
    }
  })().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, pending);
  return pending;
}

export interface CachedSeaLevelSampling {
  cells: ElevationSampleCell[];
  cellElevations: number[];
  divisions: number;
  complete: boolean;
}

export function readSeaLevelSamplingCache(
  gameArea: GameArea,
): CachedSeaLevelSampling | undefined {
  return readCachedMemoryEntry<CachedSeaLevelSampling>(
    seaLevelSamplingCacheKey(gameArea),
  );
}

export async function readSeaLevelSamplingCacheAsync(
  gameArea: GameArea,
): Promise<CachedSeaLevelSampling | undefined> {
  const memoryValue = readSeaLevelSamplingCache(gameArea);
  if (memoryValue !== undefined) {
    return memoryValue;
  }

  return readPersistedEntry<CachedSeaLevelSampling>(
    seaLevelSamplingCacheKey(gameArea),
  );
}

export async function writeSeaLevelSamplingCache(
  gameArea: GameArea,
  value: CachedSeaLevelSampling,
): Promise<void> {
  await writeCachedValue(seaLevelSamplingCacheKey(gameArea), value);
}

export async function clearGeographicFeatureCacheForTests(): Promise<void> {
  memoryCache.clear();
  inFlight.clear();
  staleServedKeys.clear();
  await clearPersistedCacheForTests();
}
