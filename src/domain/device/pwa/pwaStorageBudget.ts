/** Tile caches: play-day cap — do not raise without Wave 0 storage evidence. */
export const PWA_TILE_CACHE_MAX_ENTRIES = 500;
export const PWA_TILE_CACHE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/** Soft quota before logging storage pressure (~250 MB). */
export const PWA_SOFT_STORAGE_BYTES = 250 * 1024 * 1024;

export function isStorageOverSoftCap(usageBytes: number): boolean {
  return usageBytes >= PWA_SOFT_STORAGE_BYTES;
}

export interface StorageEstimateSnapshot {
  usage: number;
  quota: number;
}

export async function readStorageEstimate(): Promise<StorageEstimateSnapshot | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return null;
  }

  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return null;
  }
}

export type StoragePressureSource = "sw" | "client";

export interface ReportStoragePressureOptions {
  source: StoragePressureSource;
  onPressure?: (snapshot: StorageEstimateSnapshot) => void;
}

export async function reportStoragePressureIfHigh(
  options: ReportStoragePressureOptions,
): Promise<StorageEstimateSnapshot | null> {
  const snapshot = await readStorageEstimate();
  if (!snapshot || !isStorageOverSoftCap(snapshot.usage)) {
    return snapshot;
  }

  if (options.source === "sw") {
    console.warn("[jetlag-sw] PWA storage over soft cap", snapshot);
  }

  options.onPressure?.(snapshot);
  return snapshot;
}
