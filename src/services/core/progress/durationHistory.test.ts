import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STAGE_PRIORS_MS } from "@/domain/progress/stagePriors";
import {
  readPersistedEntryIgnoringExpiry,
  writePersistedEntry,
} from "@/services/geo/cache/indexedDb";
import { PROGRESS_HISTORY_CACHE_KEY } from "@/services/geo/cache/keys";
import {
  configureDurationHistoryStore,
  expectedStageMs,
  MAX_HISTORY_RECORDS,
  readDurationRecordsForTests,
  recordStageDuration,
  resetDurationHistoryForTests,
} from "./durationHistory";

const spec = { kind: "fetch" as const, label: "Search", historyKey: "overpass:tentacle" };

describe("durationHistory", () => {
  beforeEach(() => {
    resetDurationHistoryForTests();
    configureDurationHistoryStore({
      read: () => readPersistedEntryIgnoringExpiry(PROGRESS_HISTORY_CACHE_KEY),
      write: (blob) => writePersistedEntry(PROGRESS_HISTORY_CACHE_KEY, blob),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    resetDurationHistoryForTests();
  });

  it("falls back to the prior with no data", () => {
    expect(expectedStageMs(spec)).toBe(STAGE_PRIORS_MS["overpass:tentacle"]);
    expect(expectedStageMs({ historyKey: "unknown:key" })).toBe(1_000);
  });

  it("updates a record by EMA", () => {
    recordStageDuration({ ...spec, sizeBucket: 4 }, 10_000);
    recordStageDuration({ ...spec, sizeBucket: 4 }, 20_000);
    expect(expectedStageMs({ ...spec, sizeBucket: 4 })).toBeCloseTo(13_000);
  });

  it("ignores durations under 30 ms", () => {
    recordStageDuration(spec, 10);
    expect(readDurationRecordsForTests()).toEqual({});
  });

  it("scales the nearest bucket by area ratio", () => {
    recordStageDuration({ ...spec, sizeBucket: 4 }, 8_000);
    expect(expectedStageMs({ ...spec, sizeBucket: 5 })).toBe(16_000);
    expect(expectedStageMs({ ...spec, sizeBucket: 3 })).toBe(4_000);
    expect(expectedStageMs({ ...spec, sizeBucket: 12 })).toBe(32_000);
  });

  it("evicts the least recently updated record past the cap", () => {
    for (let index = 0; index <= MAX_HISTORY_RECORDS; index += 1) {
      recordStageDuration({ ...spec, historyKey: `key:${index}` }, 100, index);
    }
    const keys = Object.keys(readDurationRecordsForTests());
    expect(keys).toHaveLength(MAX_HISTORY_RECORDS);
    expect(keys).not.toContain("key:0#0");
  });

  it("debounces writes into one persisted blob", async () => {
    vi.useFakeTimers();
    recordStageDuration(spec, 1_000);
    recordStageDuration(spec, 2_000);
    await vi.advanceTimersByTimeAsync(2_500);
    vi.useRealTimers();
    await vi.waitFor(async () => {
      const blob = await readPersistedEntryIgnoringExpiry<Record<string, unknown>>(
        PROGRESS_HISTORY_CACHE_KEY,
      );
      expect(blob && Object.keys(blob)).toEqual(["overpass:tentacle#0"]);
    });
  });

  it("never overwrites stored history when the first read failed", async () => {
    vi.useFakeTimers();
    const write = vi.fn(async () => {});
    configureDurationHistoryStore({
      read: async () => {
        throw new Error("IndexedDB unavailable");
      },
      write,
    });
    recordStageDuration(spec, 1_000);
    await vi.advanceTimersByTimeAsync(2_500);
    expect(write).not.toHaveBeenCalled();
  });

  it("estimates from priors with no store configured", () => {
    configureDurationHistoryStore(null);
    expect(expectedStageMs(spec)).toBe(STAGE_PRIORS_MS["overpass:tentacle"]);
  });
});
