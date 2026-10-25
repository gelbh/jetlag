import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TransitStation } from "@/domain/session/hiding/hidingZone";
import * as overpassClient from "../../core/overpass/overpassClient";
import type { GtfsStaticBundle } from "../../transit/gtfsBundle";
import { loadGtfsBundle } from "../../transit/gtfsRouteGraph";
import {
  fetchTransitStationsForHidingZone,
  fetchTransitStationsForHidingZoneViewport,
  HIDING_ZONE_OVERPASS_TIMEOUT_MS,
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

  it("unions GTFS and Overpass when the bundle has stops in area", async () => {
    vi.mocked(loadGtfsBundle).mockResolvedValue(NYC_BUNDLE);
    vi.mocked(overpassClient.queryOverpass).mockResolvedValue({
      elements: [OVERPASS_STATION],
    });

    const stations = await fetchTransitStationsForHidingZone(MIDTOWN_GAME_AREA);

    expect(stations.map((station) => station.id)).toEqual(
      expect.arrayContaining(["nyc:penn", "nyc:times", "9001"]),
    );
    expect(overpassClient.queryOverpass).toHaveBeenCalledTimes(1);
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

  it("viewport: unions GTFS stations in the clipped bbox with Overpass", async () => {
    vi.mocked(loadGtfsBundle).mockResolvedValue(NYC_BUNDLE);
    vi.mocked(overpassClient.queryOverpass).mockResolvedValue({
      elements: [OVERPASS_STATION],
    });

    const stations = await fetchTransitStationsForHidingZoneViewport(
      { south: 40.748, west: -73.996, north: 40.753, east: -73.99 },
      MIDTOWN_GAME_AREA,
    );

    expect(stations.map((station) => station.id)).toEqual(
      expect.arrayContaining(["nyc:penn", "9001"]),
    );
    expect(overpassClient.queryOverpass).toHaveBeenCalledTimes(1);
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

  it("waits out a slow GTFS load and still unions Overpass when both arrive", async () => {
    vi.useFakeTimers();
    try {
      let resolveBundle!: (value: GtfsStaticBundle) => void;
      vi.mocked(loadGtfsBundle).mockReturnValue(
        new Promise<GtfsStaticBundle>((resolve) => {
          resolveBundle = resolve;
        }),
      );
      vi.mocked(overpassClient.queryOverpass).mockResolvedValue({
        elements: [OVERPASS_STATION],
      });

      const pending = fetchTransitStationsForHidingZoneViewport(
        { south: 40.748, west: -73.996, north: 40.753, east: -73.99 },
        MIDTOWN_GAME_AREA,
      );

      await vi.advanceTimersByTimeAsync(HIDING_ZONE_OVERPASS_TIMEOUT_MS + 1000);
      resolveBundle(NYC_BUNDLE);
      const stations = await pending;

      expect(stations.map((station) => station.id)).toEqual(
        expect.arrayContaining(["nyc:penn", "9001"]),
      );
      expect(overpassClient.queryOverpass).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("times out only the Overpass leg and still delivers late results via onStations", async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(loadGtfsBundle).mockResolvedValue(null);
      let resolveOverpass!: (value: { elements: (typeof OVERPASS_STATION)[] }) => void;
      vi.mocked(overpassClient.queryOverpass).mockReturnValue(
        new Promise((resolve) => {
          resolveOverpass = resolve;
        }),
      );

      const late: TransitStation[] = [];
      const pending = fetchTransitStationsForHidingZoneViewport(
        { south: 40.748, west: -73.996, north: 40.753, east: -73.99 },
        MIDTOWN_GAME_AREA,
        {
          onStations: (stations) => {
            late.push(...stations);
          },
        },
      );

      const rejection = expect(pending).rejects.toThrow(/Couldn't load transit stations/i);
      await vi.advanceTimersByTimeAsync(HIDING_ZONE_OVERPASS_TIMEOUT_MS);
      await rejection;

      resolveOverpass({ elements: [OVERPASS_STATION] });
      await vi.advanceTimersByTimeAsync(1);

      expect(late.map((station) => station.id)).toEqual(["9001"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("drops a timed-out Overpass lookup to the background lane instead of aborting it", async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(loadGtfsBundle).mockResolvedValue(null);
      vi.mocked(overpassClient.queryOverpass).mockReturnValue(new Promise(() => {}));

      const pending = fetchTransitStationsForHidingZoneViewport(
        { south: 40.748, west: -73.996, north: 40.753, east: -73.99 },
        MIDTOWN_GAME_AREA,
      );
      const rejection = expect(pending).rejects.toThrow(/Couldn't load transit stations/i);
      const options = vi.mocked(overpassClient.queryOverpass).mock.calls[0]?.[1];
      const priority = options?.priority as () => string;
      expect(priority()).toBe("foreground");

      await vi.advanceTimersByTimeAsync(HIDING_ZONE_OVERPASS_TIMEOUT_MS);
      await rejection;
      expect(priority()).toBe("background");
    } finally {
      vi.useRealTimers();
    }
  });

  it("applies no stations, not even GTFS ones, after a Cancel", async () => {
    vi.mocked(loadGtfsBundle).mockResolvedValue(NYC_BUNDLE);
    const controller = new AbortController();
    vi.mocked(overpassClient.queryOverpass).mockImplementation(async () => {
      controller.abort(new DOMException("Cancelled.", "AbortError"));
      throw new DOMException("Cancelled.", "AbortError");
    });

    await expect(
      fetchTransitStationsForHidingZoneViewport(
        { south: 40.748, west: -73.996, north: 40.753, east: -73.99 },
        MIDTOWN_GAME_AREA,
        { load: { signal: controller.signal } },
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
