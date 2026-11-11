import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchingFeature } from "@/domain/geo/types";
import type { GameArea } from "@/domain/map/annotations";
import * as overpassClient from "../../core/overpass/overpassClient";
import * as gtfsPlayAreaStations from "../../transit/gtfsPlayAreaStations";
import { clearGeographicFeatureCacheForTests } from "../cache";
import { fetchMatchingFeaturesInArea } from "./fetch";

vi.mock("../../transit/gtfsPlayAreaStations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../transit/gtfsPlayAreaStations")>();
  return {
    ...actual,
    fetchGtfsMatchingStationsForPlayArea: vi.fn(),
  };
});

vi.mock("../../core/overpass/overpassClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../core/overpass/overpassClient")>();
  return {
    ...actual,
    queryOverpass: vi.fn(actual.queryOverpass),
  };
});

const GAME_AREA: GameArea = {
  type: "Polygon",
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

const FILTERED_GTFS: MatchingFeature[] = [
  {
    id: "nyc:penn",
    name: "34 St-Penn Station",
    point: [-73.9935, 40.7506],
    inPlayArea: true,
  },
];

describe("station name categories use Transit Line station set", () => {
  beforeEach(async () => {
    vi.mocked(gtfsPlayAreaStations.fetchGtfsMatchingStationsForPlayArea).mockReset();
    vi.mocked(overpassClient.queryOverpass).mockReset();
    await clearGeographicFeatureCacheForTests();
  });

  afterEach(async () => {
    vi.mocked(gtfsPlayAreaStations.fetchGtfsMatchingStationsForPlayArea).mockReset();
    vi.mocked(overpassClient.queryOverpass).mockReset();
    await clearGeographicFeatureCacheForTests();
  });

  it("uses filtered GTFS stations for station name length when GTFS returns a set", async () => {
    vi.mocked(gtfsPlayAreaStations.fetchGtfsMatchingStationsForPlayArea).mockResolvedValue(
      FILTERED_GTFS,
    );

    const features = await fetchMatchingFeaturesInArea(GAME_AREA, "station_name_length", {
      transitMetroId: "nyc",
      transitStationFilter: ["metro"],
    });

    expect(gtfsPlayAreaStations.fetchGtfsMatchingStationsForPlayArea).toHaveBeenCalledWith(
      GAME_AREA,
      { transitMetroId: "nyc", transitStationFilter: ["metro"] },
    );
    expect(overpassClient.queryOverpass).not.toHaveBeenCalled();
    expect(features).toEqual([
      {
        id: "station-name-length:18",
        name: "18 characters (34 St-Penn Station)",
        point: [-73.9935, 40.7506],
      },
    ]);
  });

  it("falls through to Overpass for station name length when GTFS returns null", async () => {
    vi.mocked(gtfsPlayAreaStations.fetchGtfsMatchingStationsForPlayArea).mockResolvedValue(null);
    vi.mocked(overpassClient.queryOverpass).mockResolvedValue({
      elements: [
        {
          id: 9001,
          tags: { name: "Overpass Station", railway: "station" },
          lat: 40.751,
          lon: -73.99,
        },
      ],
    });

    const features = await fetchMatchingFeaturesInArea(GAME_AREA, "station_name_length", {
      transitMetroId: "nyc",
      transitStationFilter: ["tram"],
    });

    expect(overpassClient.queryOverpass).toHaveBeenCalledTimes(1);
    expect(features).toHaveLength(1);
    expect(features[0]).toMatchObject({
      id: "station-name-length:16",
      name: "16 characters (Overpass Station)",
    });
    expect(features[0]?.point).toEqual([40.751, -73.99]);
  });
});
