import { afterEach, describe, expect, it, vi } from "vitest";
import { gameAreaToBoundingBox } from "../../domain/geometry/gameArea/geometry";
import type { GtfsStaticBundle } from "./gtfsBundle";
import {
  clearGtfsBundleCacheForTests,
  filterGtfsStopsByMode,
  filterGtfsStopsForBoundingBox,
  filterGtfsStopsForGameArea,
  gtfsStopsShareStationOrRoute,
  gtfsStopsToTransitStations,
  loadGtfsBundle,
  nearestGtfsStopInGameArea,
  resolveTransitLineMatch,
  stationIdentity,
} from "./gtfsRouteGraph";

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
    {
      id: "nyc:grand",
      name: "Grand Central-42 St",
      lat: 40.7527,
      lng: -73.9772,
    },
    {
      id: "nyc:union",
      name: "14 St-Union Sq",
      lat: 40.7347,
      lng: -73.9897,
    },
    {
      id: "nyc:union-n",
      name: "14 St-Union Sq (North)",
      lat: 40.7355,
      lng: -73.9904,
      parentStationId: "nyc:union",
    },
    {
      id: "nyc:bus",
      name: "34 St & 7 Av",
      lat: 40.7508,
      lng: -73.9938,
    },
  ],
  routes: [
    { id: "route-1", shortName: "1", longName: "Broadway-7 Avenue Local", mode: "metro" },
    { id: "route-l", shortName: "L", longName: "14 Street-Canarsie Local", mode: "metro" },
    { id: "route-4", shortName: "4", longName: "Lexington Avenue Express", mode: "metro" },
    { id: "route-bus", shortName: "M15", longName: "M15 SBS", mode: "bus" },
  ],
  stopRouteIds: {
    "nyc:penn": ["route-1"],
    "nyc:times": ["route-1", "route-l"],
    "nyc:grand": ["route-4"],
    "nyc:union": ["route-l"],
    "nyc:union-n": ["route-l"],
    "nyc:bus": ["route-bus"],
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

describe("gtfsRouteGraph", () => {
  it("collapses child stops to parent station identity", () => {
    expect(stationIdentity("nyc:union-n", NYC_BUNDLE)).toBe("nyc:union");
    expect(stationIdentity("nyc:penn", NYC_BUNDLE)).toBe("nyc:penn");
  });

  it("treats parent and child stops as the same station", () => {
    expect(gtfsStopsShareStationOrRoute("nyc:union", "nyc:union-n", NYC_BUNDLE)).toBe(true);
  });

  it("treats stops on a shared route as a match", () => {
    expect(gtfsStopsShareStationOrRoute("nyc:penn", "nyc:times", NYC_BUNDLE)).toBe(true);
  });

  it("rejects stops on unrelated routes", () => {
    const bundle: GtfsStaticBundle = {
      ...NYC_BUNDLE,
      stopRouteIds: {
        "nyc:penn": ["route-1"],
        "nyc:grand": ["route-4"],
      },
      stops: [
        ...NYC_BUNDLE.stops,
        {
          id: "nyc:grand",
          name: "Grand Central-42 St",
          lat: 40.7527,
          lng: -73.9772,
        },
      ],
    };

    expect(gtfsStopsShareStationOrRoute("nyc:penn", "nyc:grand", bundle)).toBe(false);
  });

  it("filters stops to the play-area bounding box", () => {
    const stops = filterGtfsStopsForGameArea(NYC_BUNDLE, MIDTOWN_GAME_AREA);
    expect(stops.map((stop) => stop.id)).toContain("nyc:penn");
    expect(stops.map((stop) => stop.id)).not.toContain("nyc:union");
  });

  it("filters stops by route mode", () => {
    const busOnly = filterGtfsStopsByMode(NYC_BUNDLE.stops, NYC_BUNDLE, "bus");
    expect(busOnly.map((stop) => stop.id)).toEqual(["nyc:bus"]);
    const metroOnly = filterGtfsStopsByMode(NYC_BUNDLE.stops, NYC_BUNDLE, "metro");
    expect(metroOnly.map((stop) => stop.id)).toContain("nyc:penn");
    expect(metroOnly.map((stop) => stop.id)).not.toContain("nyc:bus");
    expect(filterGtfsStopsByMode(NYC_BUNDLE.stops, NYC_BUNDLE, "tram")).toEqual([]);
    expect(filterGtfsStopsByMode(NYC_BUNDLE.stops, NYC_BUNDLE, "all")).toHaveLength(
      NYC_BUNDLE.stops.length,
    );
  });

  it("filters stops to an explicit bounding box", () => {
    const bbox = gameAreaToBoundingBox(MIDTOWN_GAME_AREA);
    const stops = filterGtfsStopsForBoundingBox(NYC_BUNDLE, bbox);
    expect(stops.map((stop) => stop.id)).toContain("nyc:penn");
    expect(stops.map((stop) => stop.id)).toContain("nyc:times");
    expect(stops.map((stop) => stop.id)).not.toContain("nyc:union");
  });

  it("maps GTFS stops to hiding-zone transit stations inside the game area", () => {
    const stations = gtfsStopsToTransitStations(NYC_BUNDLE.stops, MIDTOWN_GAME_AREA);
    expect(stations).toEqual(
      expect.arrayContaining([
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
      ]),
    );
    expect(stations.map((station) => station.id)).not.toContain("nyc:union");
    expect(stations.map((station) => station.id)).not.toContain("nyc:union-n");
  });

  it("collapses child stops when the parent is present in the filtered set", () => {
    const downtownGameArea = {
      type: "Polygon" as const,
      coordinates: [
        [
          [-74.01, 40.73],
          [-73.97, 40.73],
          [-73.97, 40.77],
          [-74.01, 40.77],
          [-74.01, 40.73],
        ],
      ],
    };

    const stations = gtfsStopsToTransitStations(NYC_BUNDLE.stops, downtownGameArea);
    const ids = stations.map((station) => station.id);
    expect(ids).toContain("nyc:union");
    expect(ids).not.toContain("nyc:union-n");
  });

  it("keeps a child stop when its parent is absent from the filtered set", () => {
    const childOnly = [
      {
        id: "nyc:union-n",
        name: "14 St-Union Sq (North)",
        lat: 40.7355,
        lng: -73.9904,
        parentStationId: "nyc:union",
      },
    ];
    const downtownGameArea = {
      type: "Polygon" as const,
      coordinates: [
        [
          [-74.01, 40.73],
          [-73.97, 40.73],
          [-73.97, 40.74],
          [-74.01, 40.74],
          [-74.01, 40.73],
        ],
      ],
    };

    const stations = gtfsStopsToTransitStations(childOnly, downtownGameArea);
    expect(stations).toEqual([
      {
        id: "nyc:union-n",
        name: "14 St-Union Sq (North)",
        lat: 40.7355,
        lng: -73.9904,
      },
    ]);
  });

  it("resolves transit line truth from seeker and hider points", async () => {
    const match = await resolveTransitLineMatch(
      [40.7508, -73.993],
      [40.756, -73.987],
      NYC_BUNDLE,
      MIDTOWN_GAME_AREA,
    );
    expect(match).toBe(true);

    const noMatch = await resolveTransitLineMatch(
      [40.7508, -73.993],
      [40.7527, -73.9772],
      NYC_BUNDLE,
      MIDTOWN_GAME_AREA,
    );
    expect(noMatch).toBe(false);
  });

  it("picks the nearest GTFS stop within the play area", () => {
    const downtownGameArea = {
      type: "Polygon" as const,
      coordinates: [
        [
          [-74.01, 40.73],
          [-73.97, 40.73],
          [-73.97, 40.77],
          [-74.01, 40.77],
          [-74.01, 40.73],
        ],
      ],
    };

    const nearest = nearestGtfsStopInGameArea([40.7354, -73.9901], NYC_BUNDLE, downtownGameArea);
    expect(nearest?.id).toBe("nyc:union-n");
  });
});

describe("loadGtfsBundle", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearGtfsBundleCacheForTests();
  });

  it("returns null without caching when the network fails transiently", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          metros: [{ id: "nyc", bundlePath: "/geo/gtfs/nyc.json" }],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => NYC_BUNDLE });
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadGtfsBundle("nyc")).resolves.toBeNull();
    await expect(loadGtfsBundle("nyc")).resolves.toBe(NYC_BUNDLE);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
