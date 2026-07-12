import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DUBLIN_CITY_GAME_AREA } from "../../test/fixtures/dublinGameArea";
import { useAdminBoundaryFeatures } from "./useAdminBoundaryFeatures";

vi.mock("../../state/preloadStore", () => ({
  usePreloadStore: vi.fn(() => ({ "4": 12 })),
}));

vi.mock("../../services/geo/adminDivisionAvailability", () => ({
  adminBoundaryLevelsForSession: vi.fn(() => [4]),
}));

vi.mock("../../services/geo/adminDivisionBoundaries", () => ({
  fetchAdminDivisionFeaturesInArea: vi.fn(async () => [
    {
      id: "division-1",
      adminLevel: 4,
      boundary: DUBLIN_CITY_GAME_AREA,
    },
  ]),
}));

describe("useAdminBoundaryFeatures", () => {
  it("returns empty features when disabled", () => {
    const { result } = renderHook(() =>
      useAdminBoundaryFeatures(DUBLIN_CITY_GAME_AREA, {}, false),
    );

    expect(result.current.features).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("loads admin boundaries when enabled", async () => {
    const { result } = renderHook(() =>
      useAdminBoundaryFeatures(DUBLIN_CITY_GAME_AREA, {}, true),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.features).toHaveLength(1);
    expect(result.current.features[0]?.id).toBe("division-1");
  });
});
