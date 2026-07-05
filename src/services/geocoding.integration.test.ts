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
          },
        ],
      });

    vi.stubGlobal("fetch", fetchMock);

    const results = await searchPlaces("Dublin");
    expect(results).toHaveLength(1);
    expect(results[0]?.displayName).toContain("Dublin");
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
        },
      ],
    });

    vi.stubGlobal("fetch", fetchMock);

    await searchPlaces("Cork");
    await searchPlaces("Cork");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
