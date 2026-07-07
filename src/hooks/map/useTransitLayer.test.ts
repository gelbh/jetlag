import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TransitStaticData } from "../../domain/map/transit";
import { DUBLIN_CITY_GAME_AREA } from "../../test/fixtures/dublinGameArea";
import { fetchLiveTransitVehicles } from "../../services/transit/transitRealtime";
import { fetchStaticTransit } from "../../services/transit/transitStatic";
import { useTransitLayer } from "./useTransitLayer";

vi.mock("../../services/transit/transitStatic", () => ({
  fetchStaticTransit: vi.fn(),
}));

vi.mock("../../services/transit/transitRealtime", () => ({
  fetchLiveTransitVehicles: vi.fn(),
}));

const staticFixture: TransitStaticData = {
  fetchedAt: "2026-01-01T00:00:00.000Z",
  stops: [
    {
      id: "stop-rail",
      name: "Rail stop",
      lat: 53.35,
      lng: -6.26,
      mode: "rail",
    },
    {
      id: "stop-bus",
      name: "Bus stop",
      lat: 53.36,
      lng: -6.27,
      mode: "bus",
    },
  ],
  routes: [
    {
      id: "route-rail",
      name: "Rail line",
      mode: "rail",
      positions: [
        [53.35, -6.26],
        [53.36, -6.25],
      ],
    },
    {
      id: "route-bus",
      name: "Bus line",
      mode: "bus",
      positions: [
        [53.36, -6.27],
        [53.37, -6.28],
      ],
    },
  ],
};

describe("useTransitLayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchStaticTransit).mockResolvedValue(staticFixture);
    vi.mocked(fetchLiveTransitVehicles).mockResolvedValue({
      vehicles: [],
      fetchedAt: "2026-01-01T00:00:00.000Z",
      source: "none",
    });
  });

  it("loads static transit data when enabled", async () => {
    const { result } = renderHook(() =>
      useTransitLayer({
        gameArea: DUBLIN_CITY_GAME_AREA,
        enabled: true,
        liveEnabled: false,
        routeFilter: "all",
      }),
    );

    await waitFor(() => {
      expect(result.current.staticData?.stops).toHaveLength(2);
    });

    expect(fetchStaticTransit).toHaveBeenCalledWith(DUBLIN_CITY_GAME_AREA);
    expect(result.current.loadingStatic).toBe(false);
  });

  it("filters static stops and routes by mode", async () => {
    const { result } = renderHook(() =>
      useTransitLayer({
        gameArea: DUBLIN_CITY_GAME_AREA,
        enabled: true,
        liveEnabled: false,
        routeFilter: "rail",
      }),
    );

    await waitFor(() => {
      expect(result.current.staticData?.stops).toHaveLength(1);
    });

    expect(result.current.staticData?.stops[0]?.mode).toBe("rail");
    expect(result.current.staticData?.routes).toHaveLength(1);
  });

  it("skips fetching when disabled", async () => {
    renderHook(() =>
      useTransitLayer({
        gameArea: DUBLIN_CITY_GAME_AREA,
        enabled: false,
        liveEnabled: false,
        routeFilter: "all",
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchStaticTransit).not.toHaveBeenCalled();
  });
});
