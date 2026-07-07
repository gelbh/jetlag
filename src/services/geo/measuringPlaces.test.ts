import { describe, expect, it, vi } from "vitest";
import type { GameArea } from "../domain/annotations";
import * as overpassClient from "./overpassClient";
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
});
