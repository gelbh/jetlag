import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearGeographicFeatureCacheForTests } from "../cache";
import { searchPlaces, suggestPlacesAtPoint } from "./index";

describe("geocoding integration", () => {
  beforeEach(async () => {
    await clearGeographicFeatureCacheForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retries transient failures before succeeding", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            place_id: 1,
            display_name: "Dublin, Ireland",
            lat: "53.3498",
            lon: "-6.2603",
            boundingbox: ["53.2", "53.5", "-6.5", "-6.0"],
            addresstype: "city",
          },
        ],
      })
      .mockResolvedValue({
        ok: true,
        json: async () => [],
      });

    vi.stubGlobal("fetch", fetchMock);

    const results = await searchPlaces("Dublin");
    expect(results).toHaveLength(1);
    expect(results[0]?.displayName).toContain("Dublin");
    expect(results[0]?.placeCategory).toBe("city");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("merges default and city-filtered search results", async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: string) => {
      const url = new URL(input);
      const featureType = url.searchParams.get("featureType");

      if (featureType === "city") {
        return {
          ok: true,
          json: async () => [
            {
              place_id: 10,
              display_name: "Prince Rupert, BC, Canada",
              lat: "54.3150",
              lon: "-130.3209",
              boundingbox: ["54.28", "54.35", "-130.38", "-130.26"],
              addresstype: "city",
              importance: 0.45,
            },
          ],
        };
      }

      return {
        ok: true,
        json: async () => [
          {
            place_id: 11,
            display_name: "Prince Rupert, Regional District, BC",
            lat: "54.3150",
            lon: "-130.3209",
            boundingbox: ["54.0", "54.6", "-130.8", "-129.8"],
            addresstype: "county",
            importance: 0.55,
          },
          {
            place_id: 10,
            display_name: "Prince Rupert, BC, Canada",
            lat: "54.3150",
            lon: "-130.3209",
            boundingbox: ["54.28", "54.35", "-130.38", "-130.26"],
            addresstype: "city",
            importance: 0.45,
          },
        ],
      };
    });

    vi.stubGlobal("fetch", fetchMock);

    const results = await searchPlaces("Prince Rupert");
    expect(results).toHaveLength(2);
    expect(results[0]?.id).toBe("10");
    expect(results[0]?.placeCategory).toBe("city");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("serves cached search results on subsequent calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          place_id: 2,
          display_name: "Cork, Ireland",
          lat: "51.8985",
          lon: "-8.4756",
          boundingbox: ["51.8", "52.0", "-8.6", "-8.3"],
          addresstype: "town",
        },
      ],
    });

    vi.stubGlobal("fetch", fetchMock);

    await searchPlaces("Cork");
    await searchPlaces("Cork");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("sends accept-language on nominatim search", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("navigator", { language: "nl-NL" });

    await searchPlaces("Amsterdam");

    const urls = fetchMock.mock.calls.map(([input]) => new URL(String(input)));
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((url) => url.searchParams.get("accept-language") === "nl-NL")).toBe(true);
    expect(
      fetchMock.mock.calls.every(([, init]) => {
        const headers = (init as RequestInit | undefined)?.headers as Record<string, string>;
        return headers?.["Accept-Language"] === "nl-NL";
      }),
    ).toBe(true);
  });

  it("includes viewbox when searching near the user", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          place_id: 3,
          display_name: "County Dublin, Ireland",
          lat: "53.3498",
          lon: "-6.2603",
          boundingbox: ["53.2", "53.5", "-6.5", "-6.0"],
          addresstype: "county",
        },
      ],
    });

    vi.stubGlobal("fetch", fetchMock);

    const near: [number, number] = [53.35, -6.26];
    await searchPlaces("co dublin", { near });

    const urls = fetchMock.mock.calls.map(([input]) => new URL(String(input)));
    const viewboxUrls = urls.filter((url) => url.searchParams.has("viewbox"));
    expect(viewboxUrls.length).toBeGreaterThan(0);
    expect(viewboxUrls[0]?.searchParams.get("viewbox")).toMatch(
      /^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/,
    );
    expect(fetchMock.mock.calls.length).toBeGreaterThan(2);
  });

  it("dedupes identical bounding boxes from different Nominatim place_ids", async () => {
    const countyBounds = ["53.2", "53.5", "-6.5", "-6.0"];
    const countyGeoJson = {
      type: "Polygon" as const,
      coordinates: [
        [
          [-6.5, 53.2],
          [-6.0, 53.2],
          [-6.0, 53.5],
          [-6.5, 53.5],
          [-6.5, 53.2],
        ],
      ],
    };

    const fetchMock = vi.fn().mockImplementation(async (input: string) => {
      const url = new URL(input);
      const featureType = url.searchParams.get("featureType");

      if (featureType === "city") {
        return {
          ok: true,
          json: async () => [
            {
              place_id: 102,
              display_name: "County Dublin, Leinster, Ireland",
              lat: "53.3498",
              lon: "-6.2603",
              boundingbox: countyBounds,
              addresstype: "county",
              importance: 0.6,
              geojson: countyGeoJson,
            },
          ],
        };
      }

      return {
        ok: true,
        json: async () => [
          {
            place_id: 100,
            display_name: "County Dublin, Leinster, Ireland",
            lat: "53.3498",
            lon: "-6.2603",
            boundingbox: countyBounds,
            addresstype: "county",
            importance: 0.5,
          },
          {
            place_id: 101,
            display_name: "County Dublin, Leinster, Ireland",
            lat: "53.3498",
            lon: "-6.2603",
            boundingbox: countyBounds,
            addresstype: "county",
            importance: 0.45,
          },
        ],
      };
    });

    vi.stubGlobal("fetch", fetchMock);

    const results = await searchPlaces("co dublin");
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("102");
    expect(results[0]?.boundary?.type).toBe("Polygon");
  });

  it("dedupes identical counties across biased and unbiased searches", async () => {
    const countyBounds = ["53.2", "53.5", "-6.5", "-6.0"];

    const fetchMock = vi.fn().mockImplementation(async (input: string) => {
      const url = new URL(input);
      const hasViewbox = url.searchParams.has("viewbox");
      const featureType = url.searchParams.get("featureType");

      if (featureType === "city") {
        return { ok: true, json: async () => [] };
      }

      if (hasViewbox) {
        return {
          ok: true,
          json: async () => [
            {
              place_id: 41,
              display_name: "County Dublin, Leinster, Ireland",
              lat: "53.3498",
              lon: "-6.2603",
              boundingbox: countyBounds,
              addresstype: "county",
              importance: 0.55,
            },
          ],
        };
      }

      return {
        ok: true,
        json: async () => [
          {
            place_id: 40,
            display_name: "County Dublin, Leinster, Ireland",
            lat: "53.3498",
            lon: "-6.2603",
            boundingbox: countyBounds,
            addresstype: "county",
            importance: 0.5,
          },
        ],
      };
    });

    vi.stubGlobal("fetch", fetchMock);

    const results = await searchPlaces("co dublin", { near: [53.35, -6.26] });
    expect(results).toHaveLength(1);
    expect(results[0]?.displayName).toContain("County Dublin");
  });

  it("merges biased and unbiased results when near is set", async () => {
    let biasedCallCount = 0;
    const fetchMock = vi.fn().mockImplementation(async (input: string) => {
      const url = new URL(input);
      const hasViewbox = url.searchParams.has("viewbox");

      if (hasViewbox) {
        biasedCallCount += 1;
        return {
          ok: true,
          json: async () => [
            {
              place_id: 20,
              display_name: "County Dublin, Ireland",
              lat: "53.3498",
              lon: "-6.2603",
              boundingbox: ["53.2", "53.5", "-6.5", "-6.0"],
              addresstype: "county",
              importance: 0.55,
            },
          ],
        };
      }

      return {
        ok: true,
        json: async () => [
          {
            place_id: 21,
            display_name: "Dublin, Franklin County, Ohio, United States",
            lat: "40.0992",
            lon: "-83.1141",
            boundingbox: ["40.0", "40.2", "-83.2", "-83.0"],
            addresstype: "city",
            importance: 0.7,
          },
        ],
      };
    });

    vi.stubGlobal("fetch", fetchMock);

    const results = await searchPlaces("Dublin", { near: [53.35, -6.26] });
    expect(results).toHaveLength(2);
    expect(results.map((place) => place.id).sort()).toEqual(["20", "21"]);
    expect(biasedCallCount).toBeGreaterThan(0);
  });

  it("suggests city, county, and state play areas at a GPS point", async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: string) => {
      const zoom = new URL(input).searchParams.get("zoom");
      const byZoom: Record<string, object> = {
        "10": {
          place_id: 1,
          display_name: "Dublin, Ireland",
          lat: "53.3498",
          lon: "-6.2603",
          boundingbox: ["53.3", "53.4", "-6.4", "-6.1"],
          addresstype: "city",
          importance: 0.7,
        },
        "8": {
          place_id: 2,
          display_name: "County Dublin, Ireland",
          lat: "53.35",
          lon: "-6.26",
          boundingbox: ["53.2", "53.5", "-6.5", "-6.0"],
          addresstype: "county",
          importance: 0.5,
        },
        "5": {
          place_id: 3,
          display_name: "Leinster, Ireland",
          lat: "53.4",
          lon: "-6.5",
          boundingbox: ["52.2", "54.1", "-8.3", "-5.9"],
          addresstype: "state",
          importance: 0.4,
        },
      };
      return { ok: true, json: async () => byZoom[zoom ?? ""] ?? { error: "Unable to geocode" } };
    });

    vi.stubGlobal("fetch", fetchMock);

    const results = await suggestPlacesAtPoint([53.35, -6.26]);
    expect(results[0]?.placeCategory).toBe("city");
    expect(results.map((place) => place.displayName)).toEqual([
      "Dublin, Ireland",
      "County Dublin, Ireland",
      "Leinster, Ireland",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
