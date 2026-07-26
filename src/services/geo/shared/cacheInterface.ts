/**
 * L1 geo cache contract (memory / IDB-backed adapters).
 * L2 R2+KV is out of scope for the geo decomposition wave.
 */
export interface GeoCacheLayer {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown, ttlMs?: number): Promise<void>;
}
