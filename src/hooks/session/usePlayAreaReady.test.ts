import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameArea } from "@/domain/map/annotations";
import * as regionPackBoundaries from "@/services/geo/matching/regionPackBoundaries";
import {
  clearResolvedMatchingAreasCacheForTests,
  resolveSessionPlayArea,
} from "@/services/geo/matching/resolveSessionMatchingAreas";
import { createTestSession } from "@/test/fixtures/sessions";
import { usePlayAreaReady } from "./usePlayAreaReady";

describe("usePlayAreaReady", () => {
  beforeEach(() => {
    clearResolvedMatchingAreasCacheForTests();
  });

  it("is ready without a session or region pack", () => {
    expect(renderHook(() => usePlayAreaReady(null)).result.current).toBe(true);
    const custom = createTestSession({ regionPackId: undefined });
    expect(renderHook(() => usePlayAreaReady(custom)).result.current).toBe(true);
  });

  it("is sync-ready when the play area is already cached", async () => {
    const session = createTestSession({
      regionPackId: "london",
      regionPackSubregionId: "camden",
    });
    vi.spyOn(regionPackBoundaries, "loadRegionPackPlayArea").mockResolvedValue(session.gameArea);
    await resolveSessionPlayArea(session);

    const { result } = renderHook(() => usePlayAreaReady(session));
    expect(result.current).toBe(true);
  });

  it("flips ready once the pack play area resolves", async () => {
    let release!: (area: GameArea) => void;
    const delayed = new Promise<GameArea>((resolve) => {
      release = resolve;
    });
    vi.spyOn(regionPackBoundaries, "loadRegionPackPlayArea").mockReturnValue(delayed);
    const session = createTestSession({
      regionPackId: "london",
      regionPackSubregionId: "camden",
    });

    const { result } = renderHook(() => usePlayAreaReady(session));
    expect(result.current).toBe(false);

    release(session.gameArea);
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});
