import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearGeographicFeatureCacheForTests } from "./geographicFeatureCache";
import { searchPlaces } from "./geocoding";

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
});
