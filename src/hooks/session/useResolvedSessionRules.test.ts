import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameArea } from "../../domain/map/annotations";
import { createTestSession } from "../../test/fixtures/sessions";
import {
  clearResolvedMatchingAreasCacheForTests,
  resolveSessionPlayArea,
} from "../../services/geo/matching/resolveSessionMatchingAreas";
import * as regionPackBoundaries from "../../services/geo/matching/regionPackBoundaries";
import { useResolvedSessionRules } from "./useResolvedSessionRules";

vi.mock("../../services/geo/matching/regionPackBoundaries", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../services/geo/matching/regionPackBoundaries")>();
  return {
    ...actual,
    loadRegionPackPlayArea: vi.fn(actual.loadRegionPackPlayArea),
    loadRegionPackMatchingAreas: vi.fn(actual.loadRegionPackMatchingAreas),
  };
});

describe("useResolvedSessionRules play area readiness", () => {
  beforeEach(() => {
    clearResolvedMatchingAreasCacheForTests();
    vi.mocked(regionPackBoundaries.loadRegionPackPlayArea).mockReset();
    vi.mocked(regionPackBoundaries.loadRegionPackMatchingAreas).mockReset();
    vi.mocked(regionPackBoundaries.loadRegionPackMatchingAreas).mockResolvedValue(
      undefined,
    );
  });

  it("sync-seeds playAreaReady from module cache without waitFor", async () => {
    const session = createTestSession({
      regionPackId: "london",
      regionPackSubregionId: "camden",
    });
    vi.mocked(regionPackBoundaries.loadRegionPackPlayArea).mockResolvedValue(
      session.gameArea,
    );
    await resolveSessionPlayArea(session);

    const { result } = renderHook(() => useResolvedSessionRules(session));

    expect(result.current.playAreaReady).toBe(true);
    expect(result.current.gameArea).toBe(session.gameArea);
  });

  it("survives session-object churn without cancelling in-flight play-area load", async () => {
    let release!: (area: GameArea) => void;
    const delayed = new Promise<GameArea>((resolve) => {
      release = resolve;
    });
    vi.mocked(regionPackBoundaries.loadRegionPackPlayArea).mockReturnValue(
      delayed,
    );

    const base = createTestSession({
      regionPackId: "london",
      regionPackSubregionId: "camden",
    });

    const { result, rerender } = renderHook(
      ({ session }) => useResolvedSessionRules(session),
      { initialProps: { session: base } },
    );

    expect(result.current.playAreaReady).toBe(false);

    for (let i = 0; i < 5; i += 1) {
      rerender({
        session: { ...base, timerAccumulatedMs: i },
      });
    }

    expect(regionPackBoundaries.loadRegionPackPlayArea).toHaveBeenCalledTimes(1);

    await act(async () => {
      release(base.gameArea);
    });

    await waitFor(() => {
      expect(result.current.playAreaReady).toBe(true);
    });
    expect(regionPackBoundaries.loadRegionPackPlayArea).toHaveBeenCalledTimes(1);
  });

  it("marks playAreaReady on load reject with session gameArea fallback", async () => {
    const session = createTestSession({
      regionPackId: "london",
      regionPackSubregionId: "camden",
    });
    vi.mocked(regionPackBoundaries.loadRegionPackPlayArea).mockRejectedValue(
      new Error("pack load failed"),
    );

    const { result } = renderHook(() => useResolvedSessionRules(session));

    await waitFor(() => {
      expect(result.current.playAreaReady).toBe(true);
    });
    expect(result.current.gameArea).toEqual(session.gameArea);
  });
});
