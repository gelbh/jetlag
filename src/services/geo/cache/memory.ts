import type { LoadPriority, ProgressNode } from "@/domain/progress/progressTree";
import { isStableCacheKey } from "./keys";

export interface GeoCacheLayer {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown, ttlMs?: number): Promise<void>;
}

export const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const STABLE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export const memoryCache = new Map<string, CacheEntry<unknown>>();
/** In-flight fetch shared by every caller of the same key; see `getOrFetchCached`. */
export interface InFlightEntry {
  promise: Promise<unknown>;
  controller: AbortController;
  node: ProgressNode;
  /** Live subscribers that can still cancel. */
  cancellable: number;
  /** A subscriber with no signal keeps the fetch alive until it settles. */
  pinned: boolean;
  /** Each live subscriber's lane, read live; any foreground one promotes the fetch. */
  priorities: Set<() => LoadPriority>;
  settled: boolean;
  /** Pending abort after the last subscriber left; a new subscriber cancels it. */
  abandonTimer: ReturnType<typeof setTimeout> | null;
}

export const inFlight = new Map<string, InFlightEntry>();
export const staleServedKeys = new Set<string>();

export function cacheTtlMsForKey(key: string): number {
  if (key.startsWith("elevation:")) {
    return DEFAULT_CACHE_TTL_MS;
  }
  if (isStableCacheKey(key)) {
    return STABLE_CACHE_TTL_MS;
  }

  return DEFAULT_CACHE_TTL_MS;
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

export function writeMemoryEntry<T>(key: string, value: T, ttlMs?: number): void {
  const ttl = ttlMs ?? cacheTtlMsForKey(key);
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttl,
  });
}

export const memoryGeoCache: GeoCacheLayer = {
  async get(key: string): Promise<unknown | null> {
    const value = readCachedMemoryEntry(key);
    return value === undefined ? null : value;
  },
  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    writeMemoryEntry(key, value, ttlMs);
  },
};

export function staleCacheCaptionForKey(key: string): string | undefined {
  return staleServedKeys.has(key) ? "Showing cached data. Tap to refresh." : undefined;
}

export function clearStaleCacheNoticesForTests(): void {
  staleServedKeys.clear();
}
