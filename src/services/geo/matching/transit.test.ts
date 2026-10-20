import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as overpassClient from "../../core/overpass/overpassClient";
import type { GtfsStaticBundle } from "../../transit/gtfsBundle";
import { loadGtfsBundle } from "../../transit/gtfsRouteGraph";
import {
  fetchTransitStationsForHidingZone,
  fetchTransitStationsForHidingZoneViewport,
} from "./transit";

vi.mock("../../transit/gtfsRouteGraph", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../transit/gtfsRouteGraph")>();
  return {
    ...actual,
    loadGtfsBundle: vi.fn(),
  };
});

vi.mock("../../core/overpass/overpassClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../core/overpass/overpassClient")>();
  return {
    ...actual,
    queryOverpass: vi.fn(actual.queryOverpass),
  };
});

const NYC_BUNDLE: GtfsStaticBundle = {
  metroId: "nyc",
  feedOnestopId: "f-dr5r-~",
  builtAt: "2026-07-11T00:00:00.000Z",
  stops: [
    {
      id: "nyc:penn",
      name: "34 St-Penn Station",
      lat: 40.7506,
      lng: -73.9935,
    },
    {
      id: "nyc:times",
      name: "Times Sq-42 St",
      lat: 40.7559,
      lng: -73.9872,
    },
  ],
  routes: [],
  stopRouteIds: {
    "nyc:penn": ["route-1"],
    "nyc:times": ["route-1"],
  },
};

const MIDTOWN_GAME_AREA = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-74.01, 40.74],
      [-73.97, 40.74],
      [-73.97, 40.77],
      [-74.01, 40.77],
      [-74.01, 40.74],
    ],
  ],
};

const OVERPASS_STATION = {
  id: 9001,
  tags: { name: "Overpass Only Station", railway: "station" },
  lat: 40.751,
  lon: -73.99,
};

describe("hiding-zone transit station fetchers", () => {
  beforeEach(() => {
    vi.mocked(loadGtfsBundle).mockReset();
    vi.mocked(overpassClient.queryOverpass).mockReset();
  });

  afterEach(() => {
    vi.mocked(loadGtfsBundle).mockReset();
    vi.mocked(overpassClient.queryOverpass).mockReset();
  });

  it("returns GTFS stations and skips Overpass when the bundle has stops in area", async () => {
    vi.mocked(loadGtfsBundle).mockResolvedValue(NYC_BUNDLE);
    vi.mocked(overpassClient.queryOverpass).mockResolvedValue({
      elements: [OVERPASS_STATION],
    });

    const stations = await fetchTransitStationsForHidingZone(MIDTOWN_GAME_AREA);

    expect(stations.map((station) => station.id)).toEqual(
      expect.arrayContaining(["nyc:penn", "nyc:times"]),
    );
    expect(stations.map((station) => station.id)).not.toContain("9001");
    expect(overpassClient.queryOverpass).not.toHaveBeenCalled();
  });

  it("falls back to Overpass when GTFS filter yields no stations", async () => {
    vi.mocked(loadGtfsBundle).mockResolvedValue({
      ...NYC_BUNDLE,
      stops: [
        {
          id: "nyc:far",
          name: "Far Stop",
          lat: 40.9,
          lng: -73.9,
        },
      ],
      stopRouteIds: { "nyc:far": ["route-1"] },
    });
    vi.mocked(overpassClient.queryOverpass).mockResolvedValue({
      elements: [OVERPASS_STATION],
    });

    const stations = await fetchTransitStationsForHidingZone(MIDTOWN_GAME_AREA);

    expect(overpassClient.queryOverpass).toHaveBeenCalledTimes(1);
    expect(stations).toEqual([
      {
        id: "9001",
        name: "Overpass Only Station",
        lat: 40.751,
        lng: -73.99,
      },
    ]);
  });

  it("falls back to Overpass when the GTFS bundle is null", async () => {
    vi.mocked(loadGtfsBundle).mockResolvedValue(null);
    vi.mocked(overpassClient.queryOverpass).mockResolvedValue({
      elements: [OVERPASS_STATION],
    });

    const stations = await fetchTransitStationsForHidingZone(MIDTOWN_GAME_AREA);

    expect(overpassClient.queryOverpass).toHaveBeenCalledTimes(1);
    expect(stations).toHaveLength(1);
    expect(stations[0]?.id).toBe("9001");
  });

  it("viewport: returns GTFS stations in the clipped bbox and skips Overpass", async () => {
    vi.mocked(loadGtfsBundle).mockResolvedValue(NYC_BUNDLE);
    vi.mocked(overpassClient.queryOverpass).mockResolvedValue({
      elements: [OVERPASS_STATION],
    });

    const stations = await fetchTransitStationsForHidingZoneViewport(
      { south: 40.748, west: -73.996, north: 40.753, east: -73.99 },
      MIDTOWN_GAME_AREA,
    );

    expect(stations.map((station) => station.id)).toEqual(["nyc:penn"]);
    expect(overpassClient.queryOverpass).not.toHaveBeenCalled();
  });

  it("viewport: falls back to Overpass when GTFS hits nothing in the clipped viewport", async () => {
    vi.mocked(loadGtfsBundle).mockResolvedValue(NYC_BUNDLE);
    vi.mocked(overpassClient.queryOverpass).mockResolvedValue({
      elements: [OVERPASS_STATION],
    });

    const stations = await fetchTransitStationsForHidingZoneViewport(
      { south: 40.76, west: -73.98, north: 40.765, east: -73.97 },
      MIDTOWN_GAME_AREA,
    );

    expect(overpassClient.queryOverpass).toHaveBeenCalledTimes(1);
    expect(stations[0]?.id).toBe("9001");
  });
});
