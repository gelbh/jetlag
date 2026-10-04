import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameArea } from "@/domain/map/annotations";
import { JOIN_PREVIEW_PLACEHOLDER_AREA } from "@/domain/session/join/joinPreviewGameArea";
import { useGameAreaTileCacheSync } from "./useGameAreaTileCacheSync";

const release = vi.hoisted(() => vi.fn());
const retainGameAreaForServiceWorker = vi.hoisted(() => vi.fn(() => release));

vi.mock("@/services/session/postGameAreaToServiceWorker", () => ({
  retainGameAreaForServiceWorker,
}));

function rectangle(west: number, south: number, east: number, north: number): GameArea {
  return {
    type: "Polygon",
    coordinates: [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    ],
  };
}

const LONDON = rectangle(-0.15, 51.48, -0.08, 51.53);

describe("useGameAreaTileCacheSync", () => {
  afterEach(() => {
    retainGameAreaForServiceWorker.mockClear();
    release.mockClear();
  });

  it("retains the game-area bbox while mounted and releases on unmount", () => {
    const { unmount } = renderHook(() => useGameAreaTileCacheSync(LONDON));
    expect(retainGameAreaForServiceWorker).toHaveBeenLastCalledWith({
      south: 51.48,
      west: -0.15,
      north: 51.53,
      east: -0.08,
    });

    unmount();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("retains null for no game area, a join-preview placeholder, or an antimeridian span", () => {
    renderHook(() => useGameAreaTileCacheSync(null));
    expect(retainGameAreaForServiceWorker).toHaveBeenLastCalledWith(null);

    renderHook(() => useGameAreaTileCacheSync(JOIN_PREVIEW_PLACEHOLDER_AREA));
    expect(retainGameAreaForServiceWorker).toHaveBeenLastCalledWith(null);

    renderHook(() => useGameAreaTileCacheSync(rectangle(-179, -20, 179, -10)));
    expect(retainGameAreaForServiceWorker).toHaveBeenLastCalledWith(null);
  });
});
