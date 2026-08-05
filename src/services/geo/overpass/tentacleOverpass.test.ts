import { afterEach, describe, expect, it, vi } from "vitest";
import * as overpassClient from "../../core/overpass/overpassClient";
import { clearGeographicFeatureCacheForTests } from "../cache";
import { clearBundledPoiCacheForTests } from "./regionPackPoi";
import {
  buildTentacleOverpassQuery,
  fetchTentaclePois,
  nearestTentaclePoi,
  parseTentaclePois,
  tentacleCategoryForTags,
} from "./tentacleOverpass";

describe("tentacle overpass", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    clearBundledPoiCacheForTests();
    await clearGeographicFeatureCacheForTests();
  });

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
                  lat: 51.5,
                  lng: -0.12,
                },
              ],
            }),
          };
        }
        throw new Error(`Unexpected fetch: ${String(input)}`);
      }),
    );

    const enrich = vi.fn();
    const pois = await fetchTentaclePois([51.5, -0.12], 1609.344, "museum", {
      regionPackId: "london",
      onEnrich: enrich,
    });

    expect(pois).toEqual([
      {
        id: "Q6373",
        name: "British Museum",
        lat: 51.5,
        lng: -0.12,
        category: "museum",
      },
    ]);
    expect(enrich).not.toHaveBeenCalled();

    await overpassStarted;
    resolveOverpass?.({
      elements: [
        {
          id: 42,
          tags: { tourism: "museum", name: "Science Museum" },
          lat: 51.501,
          lon: -0.121,
        },
      ],
    });

    await vi.waitFor(() => {
      expect(enrich).toHaveBeenCalledTimes(1);
    });

    const enriched = enrich.mock.calls[0]?.[0] ?? [];
    expect(enriched.map((poi: { name: string }) => poi.name)).toEqual([
      "Science Museum",
      "British Museum",
    ]);
  });

  it("awaits Overpass when the tentacle bundle is empty", async () => {
    const queryOverpass = vi
      .spyOn(overpassClient, "queryOverpass")
      .mockResolvedValue({
        elements: [
          {
            id: 8,
            tags: { amenity: "hospital", name: "Live Hospital" },
            lat: 51.5,
            lon: -0.12,
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

    const enrich = vi.fn();
    const pois = await fetchTentaclePois([51.5, -0.12], 1609.344, "hospital", {
      regionPackId: "london",
      onEnrich: enrich,
    });

    expect(queryOverpass).toHaveBeenCalled();
    expect(enrich).not.toHaveBeenCalled();
    expect(pois).toEqual([
      {
        id: "8",
        name: "Live Hospital",
        lat: 51.5,
        lng: -0.12,
        category: "hospital",
      },
    ]);
  });
});
