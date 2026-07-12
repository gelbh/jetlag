import { describe, expect, it } from "vitest";
import type { GtfsStaticBundle } from "./gtfsBundle";
import {
  filterGtfsStopsForGameArea,
  gtfsStopsShareStationOrRoute,
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
  ],
  routes: [],
  stopRouteIds: {
    "nyc:penn": ["route-1"],
    "nyc:times": ["route-1", "route-l"],
    "nyc:grand": ["route-4"],
    "nyc:union": ["route-l"],
    "nyc:union-n": ["route-l"],
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
    expect(
      gtfsStopsShareStationOrRoute("nyc:union", "nyc:union-n", NYC_BUNDLE),
    ).toBe(true);
  });

  it("treats stops on a shared route as a match", () => {
    expect(
      gtfsStopsShareStationOrRoute("nyc:penn", "nyc:times", NYC_BUNDLE),
    ).toBe(true);
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

    expect(
      gtfsStopsShareStationOrRoute("nyc:penn", "nyc:grand", bundle),
    ).toBe(false);
  });

  it("filters stops to the play-area bounding box", () => {
    const stops = filterGtfsStopsForGameArea(NYC_BUNDLE, MIDTOWN_GAME_AREA);
    expect(stops.map((stop) => stop.id)).toContain("nyc:penn");
    expect(stops.map((stop) => stop.id)).not.toContain("nyc:union");
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

    const nearest = nearestGtfsStopInGameArea(
      [40.7354, -73.9901],
      NYC_BUNDLE,
      downtownGameArea,
    );
    expect(nearest?.id).toBe("nyc:union-n");
  });
});
