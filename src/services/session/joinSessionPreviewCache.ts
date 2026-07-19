const cache = new Map<string, { value: unknown; expiresAt: number }>();

export const JOIN_PREVIEW_TTL_MS = 45_000;
export const JOIN_PREVIEW_DEBOUNCE_MS = 300;

export function getCachedJoinPreview<T>(code: string): T | undefined {
  const entry = cache.get(code);
  if (!entry || entry.expiresAt <= Date.now()) {
    cache.delete(code);
    return undefined;
  }
  return entry.value as T;
}

export function setCachedJoinPreview<T>(code: string, value: T): void {
  cache.set(code, { value, expiresAt: Date.now() + JOIN_PREVIEW_TTL_MS });
}

export function clearJoinPreviewCacheForTests(): void {
  cache.clear();
}
