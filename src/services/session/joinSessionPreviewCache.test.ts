import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearJoinPreviewCacheForTests,
  getCachedJoinPreview,
  JOIN_PREVIEW_TTL_MS,
  setCachedJoinPreview,
} from "./joinSessionPreviewCache";

describe("joinSessionPreviewCache", () => {
  beforeEach(() => {
    clearJoinPreviewCacheForTests();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns cached value within TTL", () => {
    setCachedJoinPreview("ABCD", { status: "found" });
    expect(getCachedJoinPreview("ABCD")).toEqual({ status: "found" });
  });

  it("expires after TTL", () => {
    setCachedJoinPreview("ABCD", { status: "found" });
    vi.advanceTimersByTime(JOIN_PREVIEW_TTL_MS + 1);
    expect(getCachedJoinPreview("ABCD")).toBeUndefined();
  });
});
