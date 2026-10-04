import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameArea } from "@/domain/map/annotations";
import { JOIN_PREVIEW_PLACEHOLDER_AREA } from "@/domain/session/join/joinPreviewGameArea";
import { useGameAreaTileCacheSync } from "./useGameAreaTileCacheSync";

const postGameAreaToServiceWorker = vi.hoisted(() => vi.fn());

vi.mock("@/services/session/postGameAreaToServiceWorker", () => ({
  postGameAreaToServiceWorker,
}));

const LONDON: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-0.15, 51.48],
      [-0.08, 51.48],
      [-0.08, 51.53],
      [-0.15, 51.53],
      [-0.15, 51.48],
    ],
  ],
};

describe("useGameAreaTileCacheSync", () => {
  afterEach(() => {
    postGameAreaToServiceWorker.mockReset();
  });

  it("posts the game-area bbox on mount and null on unmount", () => {
    const { unmount } = renderHook(() => useGameAreaTileCacheSync(LONDON));
    expect(postGameAreaToServiceWorker).toHaveBeenLastCalledWith({
      south: 51.48,
      west: -0.15,
      north: 51.53,
      east: -0.08,
    });

    unmount();
    expect(postGameAreaToServiceWorker).toHaveBeenLastCalledWith(null);
  });

  it("does not re-post when an equal game area arrives as a new object", () => {
    const { rerender } = renderHook(({ area }) => useGameAreaTileCacheSync(area), {
      initialProps: { area: LONDON },
    });
    const calls = postGameAreaToServiceWorker.mock.calls.length;
    rerender({ area: structuredClone(LONDON) });
    expect(postGameAreaToServiceWorker.mock.calls.length).toBe(calls);
  });

  it("posts null for no game area or a join-preview placeholder", () => {
    renderHook(() => useGameAreaTileCacheSync(null));
    expect(postGameAreaToServiceWorker).toHaveBeenLastCalledWith(null);

    renderHook(() => useGameAreaTileCacheSync(JOIN_PREVIEW_PLACEHOLDER_AREA));
    expect(postGameAreaToServiceWorker).toHaveBeenLastCalledWith(null);
  });
});
