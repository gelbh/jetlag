export function createMemoryCache(ttlMs) {
  const entries = new Map();

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) {
        return undefined;
      }

      if (entry.expiresAt <= Date.now()) {
        entries.delete(key);
        return undefined;
      }

      return entry.value;
    },
    set(key, value) {
      entries.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
    },
    clear() {
      entries.clear();
    },
  };
}
