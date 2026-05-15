import type { Feature, LineString } from "geojson";
import type { GameArea } from "../domain/annotations";
import type { ElevationSampleCell } from "../domain/seaLevel";

const CACHE_TTL_MS = 15 * 60 * 1000;
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

function stableGameAreaKey(gameArea: GameArea): string {
  return JSON.stringify(gameArea.coordinates);
}

export function geographicCacheKey(gameArea: GameArea, scope: string): string {
  return `${scope}:${stableGameAreaKey(gameArea)}`;
}

function readMemoryEntry<T>(key: string): T | undefined {
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

function writeMemoryEntry<T>(key: string, value: T): void {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB open failed"));
  });
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

    database.close();

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
      expiresAt: Date.now() + CACHE_TTL_MS,
    } satisfies PersistedCacheEntry<T>);

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Cache write failed"));
    });

    database.close();
  } catch {
    // Ignore persistence failures; memory cache still helps this session.
  }
}

async function writeCachedValue<T>(key: string, value: T): Promise<void> {
  writeMemoryEntry(key, value);
  await writePersistedEntry(key, value);
}

export async function getOrFetchCached<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const memoryValue = readMemoryEntry<T>(key);
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

    const value = await fetcher();
    await writeCachedValue(key, value);
    return value;
  })().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, pending);
  return pending;
}

export type CachedLinearSegments = Feature<LineString>[];

export interface CachedSeaLevelSampling {
  cells: ElevationSampleCell[];
  cellElevations: number[];
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

export async function clearGeographicFeatureCacheForTests(): Promise<void> {
  memoryCache.clear();
  inFlight.clear();

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

    database.close();
  } catch {
    // Ignore persistence failures in tests.
  }
}
