import { isStableCacheKey } from "./keys";

export const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const STABLE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export const memoryCache = new Map<string, CacheEntry<unknown>>();
export const inFlight = new Map<string, Promise<unknown>>();
export const staleServedKeys = new Set<string>();

export function cacheTtlMsForKey(key: string): number {
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

export function writeMemoryEntry<T>(key: string, value: T): void {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + cacheTtlMsForKey(key),
  });
}

export function staleCacheCaptionForKey(key: string): string | undefined {
  return staleServedKeys.has(key)
    ? "Showing cached data. Tap to refresh."
    : undefined;
}

export function clearStaleCacheNoticesForTests(): void {
  staleServedKeys.clear();
}
