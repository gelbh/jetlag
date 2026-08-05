import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameArea } from "@/domain/map/annotations";
import * as overpassClient from "../../core/overpass/overpassClient";
import { clearGeographicFeatureCacheForTests } from "../cache";
import { clearBundledPoiCacheForTests } from "./regionPackPoi";
import {
  fetchMeasuringPlacesInArea,
  findNearestMeasuringPlace,
  parseMeasuringPlaces,
} from "./measuringPlaces";

const sampleGameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-0.2, 51.4],
      [-0.1, 51.4],
      [-0.1, 51.5],
      [-0.2, 51.5],
      [-0.2, 51.4],
    ],
  ],
};

describe("measuring places", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    clearBundledPoiCacheForTests();
    await clearGeographicFeatureCacheForTests();
  });

  it("filters places to the play area and finds the nearest museum", async () => {
    vi.spyOn(overpassClient, "queryOverpass").mockResolvedValue({
      elements: [
        {
          id: 1,
          tags: { name: "Near Museum" },
          lat: 51.45,
          lon: -0.16,
        },
        {
          id: 2,
          tags: { name: "Far Museum" },
          lat: 51.42,
          lon: -0.19,
        },
        {
          id: 3,
          tags: { name: "Outside Museum" },
          lat: 51.2,
          lon: -0.5,
        },
      ],
    });

    const places = parseMeasuringPlaces(
      [
        {
          id: 1,
          tags: { name: "Near Museum" },
          lat: 51.45,
          lon: -0.16,
        },
        {
          id: 2,
          tags: { name: "Far Museum" },
          lat: 51.42,
          lon: -0.19,
        },
        {
          id: 3,
          tags: { name: "Outside Museum" },
          lat: 51.2,
          lon: -0.5,
        },
      ],
      sampleGameArea,
    );

    expect(places).toHaveLength(2);

    const nearest = await findNearestMeasuringPlace(
      [51.46, -0.15],
      sampleGameArea,
      "museum",
    );

    expect(nearest?.name).toBe("Near Museum");
    expect(nearest?.distanceMeters).toBeGreaterThan(0);
  });

  it("drops unnamed or disused venues", () => {
    const places = parseMeasuringPlaces(
      [
        {
          id: 1,
          tags: { tourism: "zoo" },
          lat: 51.45,
          lon: -0.16,
        },
        {
          id: 2,
          tags: { name: "Closed Zoo", disused: "yes" },
          lat: 51.45,
          lon: -0.17,
        },
        {
          id: 3,
          tags: { name: "City Zoo" },
          lat: 51.45,
          lon: -0.18,
        },
      ],
      sampleGameArea,
    );

    expect(places).toEqual([
      {
        id: "3",
        name: "City Zoo",
        point: [51.45, -0.18],
      },
    ]);
  });

  it("limits map snaps to venues within the search radius", async () => {
    vi.spyOn(overpassClient, "queryOverpass").mockResolvedValue({
      elements: [
        {
          id: 1,
          tags: { name: "Far Museum" },
          lat: 51.42,
          lon: -0.19,
        },
      ],
    });

    const nearest = await findNearestMeasuringPlace(
      [51.46, -0.15],
      sampleGameArea,
      "museum",
      { maxDistanceMeters: 500 },
    );

    expect(nearest).toBeNull();
  });

  it("builds a valid commercial airport overpass query", async () => {
    vi.restoreAllMocks();
    const queryOverpass = vi
      .spyOn(overpassClient, "queryOverpass")
      .mockResolvedValue({ elements: [] });

    await fetchMeasuringPlacesInArea(sampleGameArea, "commercial_airport");

    const query = String(queryOverpass.mock.calls.at(-1)?.[0] ?? "");
    expect(query).toContain("[aeroway=aerodrome][iata]");
    expect(query).toContain("[aeroway=aerodrome][icao]");
    expect(query).not.toContain("aerodrome:type");
  });

  it("includes named bodies of water and excludes pools and unnamed water", () => {
    const places = parseMeasuringPlaces(
      [
        {
          id: 1,
          tags: { name: "Serpentine", natural: "water" },
          lat: 51.45,
          lon: -0.16,
        },
        {
          id: 2,
          tags: { natural: "water" },
          lat: 51.45,
          lon: -0.17,
        },
        {
          id: 3,
          tags: { name: "Lido Pool", leisure: "swimming_pool" },
          lat: 51.45,
          lon: -0.18,
        },
        {
          id: 4,
          tags: { name: "Hyde Park Pond", water: "pond" },
          lat: 51.44,
          lon: -0.19,
        },
      ],
      sampleGameArea,
      "body_of_water",
    );

    expect(places).toEqual([
      {
        id: "1",
        name: "Serpentine",
        point: [51.45, -0.16],
      },
      {
        id: "4",
        name: "Hyde Park Pond",
        point: [51.44, -0.19],
      },
    ]);
  });

  it("finds the nearest named body of water", async () => {
    vi.spyOn(overpassClient, "queryOverpass").mockResolvedValue({
      elements: [
        {
          id: 1,
          tags: { name: "Near Lake", natural: "water" },
          lat: 51.45,
          lon: -0.16,
        },
        {
          id: 2,
          tags: { name: "Far Reservoir", landuse: "reservoir" },
          lat: 51.42,
          lon: -0.19,
        },
      ],
    });

    const nearest = await findNearestMeasuringPlace(
      [51.46, -0.15],
      sampleGameArea,
      "body_of_water",
    );

    expect(nearest?.name).toBe("Near Lake");
    expect(nearest?.distanceMeters).toBeGreaterThan(0);
  });

  it("resolves from the bundle without awaiting slow Overpass when onEnrich is set", async () => {
    let resolveOverpass: ((value: { elements: unknown[] }) => void) | undefined;
    const overpassStarted = new Promise<void>((resolveStarted) => {
      vi.spyOn(overpassClient, "queryOverpass").mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveStarted();
            resolveOverpass = resolve;
          }),
      );
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === "/geo/london/poi/museum.json") {
          return {
            ok: true,
            json: async () => ({
              category: "museum",
              source: "wikidata",
              places: [
                {
                  id: "Q6373",
                  name: "British Museum",
                  lat: 51.45,
                  lng: -0.16,
                },
              ],
            }),
          };
        }
        throw new Error(`Unexpected fetch: ${String(input)}`);
      }),
    );

    const enrich = vi.fn();
    const placesPromise = fetchMeasuringPlacesInArea(
      sampleGameArea,
      "museum",
      [],
      "london",
      { onEnrich: enrich },
    );

    const places = await placesPromise;
    expect(places).toEqual([
      {
        id: "Q6373",
        name: "British Museum",
        point: [51.45, -0.16],
      },
    ]);
    expect(enrich).not.toHaveBeenCalled();

    await overpassStarted;
    resolveOverpass?.({
      elements: [
        {
          id: 99,
          tags: { name: "Science Museum", tourism: "museum" },
          lat: 51.44,
          lon: -0.17,
        },
      ],
    });

    await vi.waitFor(() => {
      expect(enrich).toHaveBeenCalledTimes(1);
    });

    const enriched = enrich.mock.calls[0]?.[0] ?? [];
    expect(enriched.map((place: { name: string }) => place.name)).toEqual([
      "Science Museum",
      "British Museum",
    ]);
  });

  it("awaits Overpass when the bundle is empty or missing", async () => {
    const queryOverpass = vi
      .spyOn(overpassClient, "queryOverpass")
      .mockResolvedValue({
        elements: [
          {
            id: 7,
            tags: { name: "Live Museum", tourism: "museum" },
            lat: 51.45,
            lon: -0.16,
          },
        ],
      });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 404,
        json: async () => ({}),
      })),
    );

    const places = await fetchMeasuringPlacesInArea(
      sampleGameArea,
      "museum",
      [],
      "london",
      { onEnrich: vi.fn() },
    );

    expect(queryOverpass).toHaveBeenCalled();
    expect(places).toEqual([
      {
        id: "7",
        name: "Live Museum",
        point: [51.45, -0.16],
      },
    ]);
  });
});
