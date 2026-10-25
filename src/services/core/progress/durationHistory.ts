import type { StageSpec } from "@/domain/progress/progressTree";
import { stagePriorMs } from "@/domain/progress/stagePriors";
import {
  readPersistedEntryIgnoringExpiry,
  writePersistedEntry,
} from "@/services/geo/cache/indexedDb";
import { PROGRESS_HISTORY_CACHE_KEY } from "@/services/geo/cache/keys";

export interface DurationRecord {
  emaMs: number;
  samples: number;
  updatedAt: number;
}

type HistoryBlob = Record<string, DurationRecord>;

const HISTORY_ALPHA = 0.3;
export const MAX_HISTORY_RECORDS = 64;
/** Stages shorter than this are cache hits and would drag estimates toward zero. */
export const MIN_RECORDED_MS = 30;
const WRITE_DEBOUNCE_MS = 2_000;
/** Bound on nearest-bucket scaling so one far bucket cannot produce absurd estimates. */
const MAX_BUCKET_SCALE = 4;

let records: HistoryBlob = {};
let hydratePromise: Promise<void> | null = null;
let hydrationFailed = false;
let writeTimer: ReturnType<typeof setTimeout> | null = null;

function recordKey(historyKey: string, bucket: number | undefined): string {
  return `${historyKey}#${bucket ?? 0}`;
}

/** Loads the persisted blob once; estimates use priors until it resolves. */
export function hydrateDurationHistory(): Promise<void> {
  hydratePromise ??= readPersistedEntryIgnoringExpiry<HistoryBlob>(PROGRESS_HISTORY_CACHE_KEY)
    .then((stored) => {
      if (stored && typeof stored === "object") {
        records = { ...stored, ...records };
      }
    })
    .catch(() => {
      // History is an optimisation; priors still work without it.
      hydrationFailed = true;
    });
  return hydratePromise;
}

function scheduleWrite(): void {
  if (writeTimer !== null) {
    return;
  }
  writeTimer = setTimeout(() => {
    writeTimer = null;
    // Writing before hydration merges would replace the stored history with this
    // session's few records; after a failed read, leave the stored blob alone.
    void hydrateDurationHistory().then(() => {
      if (!hydrationFailed) {
        void writePersistedEntry(PROGRESS_HISTORY_CACHE_KEY, records);
      }
    });
  }, WRITE_DEBOUNCE_MS);
}

function evictOldest(): void {
  const keys = Object.keys(records);
  if (keys.length <= MAX_HISTORY_RECORDS) {
    return;
  }
  keys.sort((a, b) => records[a].updatedAt - records[b].updatedAt);
  for (const key of keys.slice(0, keys.length - MAX_HISTORY_RECORDS)) {
    delete records[key];
  }
}

export function recordStageDuration(spec: StageSpec, durationMs: number, nowMs = Date.now()): void {
  if (!(durationMs >= MIN_RECORDED_MS)) {
    return;
  }
  const key = recordKey(spec.historyKey, spec.sizeBucket);
  const previous = records[key];
  records[key] = previous
    ? {
        emaMs: HISTORY_ALPHA * durationMs + (1 - HISTORY_ALPHA) * previous.emaMs,
        samples: previous.samples + 1,
        updatedAt: nowMs,
      }
    : { emaMs: durationMs, samples: 1, updatedAt: nowMs };
  evictOldest();
  scheduleWrite();
}

/** Expected duration: exact bucket, else nearest bucket scaled by area ratio, else prior. */
export function expectedStageMs(spec: Pick<StageSpec, "historyKey" | "sizeBucket">): number {
  const bucket = spec.sizeBucket ?? 0;
  const exact = records[recordKey(spec.historyKey, bucket)];
  if (exact) {
    return exact.emaMs;
  }

  const prefix = `${spec.historyKey}#`;
  let nearest: { bucket: number; record: DurationRecord } | null = null;
  for (const [key, record] of Object.entries(records)) {
    if (!key.startsWith(prefix)) {
      continue;
    }
    const candidate = Number(key.slice(prefix.length));
    if (!Number.isFinite(candidate)) {
      continue;
    }
    if (nearest === null || Math.abs(candidate - bucket) < Math.abs(nearest.bucket - bucket)) {
      nearest = { bucket: candidate, record };
    }
  }
  if (nearest) {
    const scale = 2 ** (bucket - nearest.bucket);
    const bounded = Math.min(MAX_BUCKET_SCALE, Math.max(1 / MAX_BUCKET_SCALE, scale));
    return nearest.record.emaMs * bounded;
  }

  return stagePriorMs(spec.historyKey);
}

export function readDurationRecordsForTests(): HistoryBlob {
  return { ...records };
}

export function resetDurationHistoryForTests(): void {
  records = {};
  hydratePromise = null;
  hydrationFailed = false;
  if (writeTimer !== null) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
}
