import type { GameArea } from "../../domain/map/annotations";
import type { ElevationSampleCell } from "../../domain/geometry/seaLevel";

const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const STABLE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DB_NAME = "jetlag-geographic-cache";
const STORE_NAME = "entries";
const DB_VERSION = 1;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface PersistedCacheEntry<T> {
  key: string;
  value: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();
const staleServedKeys = new Set<string>();
let databasePromise: Promise<IDBDatabase> | null = null;

function stableGameAreaKey(gameArea: GameArea): string {
  return JSON.stringify(gameArea.coordinates);
}

export function geographicCacheKey(gameArea: GameArea, scope: string): string {
  return `${scope}:${stableGameAreaKey(gameArea)}`;
}

export function readCachedMemoryEntry<T>(key: string): T | undefined {
  const entry = memoryCache.get(key);
  if (!entry) {
    return undefined;
  }

  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return undefined;
  }

  return entry.value as T;
}

function cacheTtlMsForKey(key: string): number {
  if (isStableCacheKey(key)) {
    return STABLE_CACHE_TTL_MS;
  }

  return DEFAULT_CACHE_TTL_MS;
}

function writeMemoryEntry<T>(key: string, value: T): void {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + cacheTtlMsForKey(key),
  });
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      databasePromise = null;
      reject(request.error ?? new Error("IndexedDB open failed"));
    };

    request.onblocked = () => {
      databasePromise = null;
      reject(new Error("IndexedDB upgrade blocked."));
    };
  });

  return databasePromise;
}

function isStableCacheKey(key: string): boolean {
  return (
    key.startsWith("admin:") ||
    key.startsWith("landmass:") ||
    key.startsWith("coastline:") ||
    key.startsWith("sea_level:sampling:")
  );
}

export function staleCacheCaptionForKey(key: string): string | undefined {
  return staleServedKeys.has(key)
    ? "Showing cached data. Tap to refresh."
    : undefined;
}

export function clearStaleCacheNoticesForTests(): void {
  staleServedKeys.clear();
}

async function readPersistedEntryIgnoringExpiry<T>(
  key: string,
): Promise<T | undefined> {
  if (typeof indexedDB === "undefined") {
    return undefined;
  }

  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    const entry = await new Promise<PersistedCacheEntry<T> | undefined>(
      (resolve, reject) => {
        request.onsuccess = () =>
          resolve(request.result as PersistedCacheEntry<T> | undefined);
        request.onerror = () =>
          reject(request.error ?? new Error("Cache read failed"));
      },
    );

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Cache read failed"));
    });

    if (!entry) {
      return undefined;
    }

    return entry.value;
  } catch {
    return undefined;
  }
}

async function readPersistedEntry<T>(key: string): Promise<T | undefined> {
  if (typeof indexedDB === "undefined") {
    return undefined;
  }

  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    const entry = await new Promise<PersistedCacheEntry<T> | undefined>(
      (resolve, reject) => {
        request.onsuccess = () =>
          resolve(request.result as PersistedCacheEntry<T> | undefined);
        request.onerror = () =>
          reject(request.error ?? new Error("Cache read failed"));
      },
    );

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Cache read failed"));
    });

    if (!entry || entry.expiresAt <= Date.now()) {
      return undefined;
    }

    writeMemoryEntry(key, entry.value);
    return entry.value;
  } catch {
    return undefined;
  }
}

async function writePersistedEntry<T>(key: string, value: T): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return;
  }

  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.put({
      key,
      value,
      expiresAt: Date.now() + cacheTtlMsForKey(key),
    } satisfies PersistedCacheEntry<T>);

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Cache write failed"));
    });
  } catch {
    // Ignore persistence failures; memory cache still helps this session.
  }
}

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

export function coastlineSegmentsCacheKey(gameArea: GameArea): string {
  return geographicCacheKey(gameArea, "coastline:segments");
}

export function linearSegmentsCacheKey(
  gameArea: GameArea,
  kind: string,
): string {
  return geographicCacheKey(gameArea, `linear:${kind}`);
}

export function seaLevelSamplingCacheKey(gameArea: GameArea): string {
  return geographicCacheKey(gameArea, "sea_level:sampling");
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

export function adminDivisionCacheKey(
  gameArea: GameArea,
  adminLevel: number,
): string {
  return geographicCacheKey(gameArea, `admin:${adminLevel}`);
}

export function landmassCacheKey(gameArea: GameArea): string {
  return geographicCacheKey(gameArea, "landmass");
}

export function measuringPlacesCacheKey(
  gameArea: GameArea,
  category: string,
): string {
  return geographicCacheKey(gameArea, `measuring:${category}`);
}

export function tentaclePoisCacheKey(
  center: [number, number],
  radiusMeters: number,
  categoryId: string,
): string {
  return `tentacle:${categoryId}:${center[0]},${center[1]}:${radiusMeters}`;
}

export function staticTransitCacheKey(gameArea: GameArea): string {
  return geographicCacheKey(gameArea, "transit:static");
}

export async function clearGeographicFeatureCacheForTests(): Promise<void> {
  memoryCache.clear();
  inFlight.clear();
  staleServedKeys.clear();

  if (typeof indexedDB === "undefined") {
    return;
  }

  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).clear();

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Cache clear failed"));
    });
  } catch {
    // Ignore persistence failures in tests.
  }
}
