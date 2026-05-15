import { describe, expect, it, vi } from "vitest";
import * as overpassClient from "./overpassClient";
import {
  buildTentacleOverpassQuery,
  fetchTentaclePois,
  nearestTentaclePoi,
  parseTentaclePois,
  tentacleCategoryForTags,
} from "./overpass";

describe("tentacle overpass", () => {
  it("builds a query for the selected category only", () => {
    const query = buildTentacleOverpassQuery([51.5, -0.12], 1609.344, "museum");

    expect(query).toContain("tourism=museum");
    expect(query).toContain("amenity=museum");
    expect(query).not.toContain("amenity=library");
    expect(query).toContain("around:1609.344,51.5,-0.12");
  });

  it("drops unnamed or disused venues and assigns the selected category", () => {
    const pois = parseTentaclePois(
      [
        {
          id: 1,
          tags: { tourism: "museum", name: "City Museum" },
          lat: 51.5,
          lon: -0.12,
        },
        {
          id: 2,
          tags: { amenity: "library", name: "Central Library" },
          lat: 51.51,
          lon: -0.11,
        },
        {
          id: 3,
          tags: { amenity: "cinema" },
          lat: 51.52,
          lon: -0.1,
        },
        {
          id: 4,
          tags: { amenity: "hospital", name: "Old Hospital", disused: "yes" },
          lat: 51.53,
          lon: -0.09,
        },
      ],
      "museum",
    );

    expect(pois).toEqual([
      {
        id: "1",
        name: "City Museum",
        lat: 51.5,
        lng: -0.12,
        category: "museum",
      },
    ]);
  });

  it("deduplicates repeated elements by id", () => {
    const pois = parseTentaclePois(
      [
        {
          id: 10,
          tags: { tourism: "museum", name: "Dup Museum" },
          lat: 51.5,
          lon: -0.12,
        },
        {
          id: 10,
          tags: { tourism: "museum", name: "Dup Museum" },
          lat: 51.5,
          lon: -0.12,
        },
      ],
      "museum",
    );

    expect(pois).toHaveLength(1);
  });

  it("resolves the nearest POI to a point with tie-break order", () => {
    const pois = parseTentaclePois(
      [
        {
          id: 1,
          tags: { tourism: "museum", name: "Near Museum" },
          lat: 51.5005,
          lon: -0.12,
        },
        {
          id: 2,
          tags: { tourism: "museum", name: "Far Museum" },
          lat: 51.6,
          lon: -0.12,
        },
      ],
      "museum",
    );

    const answer = nearestTentaclePoi([51.5, -0.12], pois);

    expect(answer?.poiId).toBe("1");
  });

  it("returns null when no candidates exist", () => {
    expect(nearestTentaclePoi([51.5, -0.12], [])).toBeNull();
  });

  it("fetches and parses tentacle POIs from Overpass", async () => {
    vi.spyOn(overpassClient, "queryOverpass").mockResolvedValue({
      elements: [
        {
          id: 5,
          tags: { amenity: "hospital", name: "General Hospital" },
          lat: 51.5,
          lon: -0.12,
        },
      ],
    });

    const pois = await fetchTentaclePois([51.5, -0.12], 1609.344, "hospital");

    expect(pois).toEqual([
      {
        id: "5",
        name: "General Hospital",
        lat: 51.5,
        lng: -0.12,
        category: "hospital",
      },
    ]);
  });

  it("maps amenity=museum tags to the museum category", () => {
    expect(
      tentacleCategoryForTags(
        { amenity: "museum", name: "Science Museum" },
        "museum",
      ),
    ).toBe("museum");
  });
});
