export interface GeoCacheLayer {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown, ttlMs?: number): Promise<void>;
}
