import { describe, expect, it, vi } from "vitest";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import type { MeasuringPlace } from "./measuringPlaces";
import { mergeMeasuringPlaces } from "./regionPackPoi";

const sampleGameArea = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-74.02, 40.7],
      [-73.93, 40.7],
      [-73.93, 40.82],
      [-74.02, 40.82],
      [-74.02, 40.7],
    ],
  ],
};

describe("regionPackPoi", () => {
  it("merges bundled places without duplicating overpass names", () => {
    const overpass: MeasuringPlace[] = [
      { id: "1", name: "Metropolitan Museum of Art", point: [40.7794, -73.9632] },
    ];
    const bundled: MeasuringPlace[] = [
      { id: "Q160236", name: "Metropolitan Museum of Art", point: [40.7794, -73.9632] },
      { id: "Q572548", name: "Anthology Film Archives", point: [40.7247, -73.9901] },
    ];

    const merged = mergeMeasuringPlaces(overpass, bundled);
    expect(merged).toHaveLength(2);
    expect(merged.map((place) => place.name)).toEqual([
      "Metropolitan Museum of Art",
      "Anthology Film Archives",
    ]);
  });

  it("loads NYC museum bundle when present", async () => {
    const { fetchBundledMeasuringPlaces, clearBundledPoiCacheForTests } =
      await import("./regionPackPoi");

    clearBundledPoiCacheForTests();

    const museumBundleUrl = "/geo/nyc/poi/museum.json";
    const originalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === museumBundleUrl) {
          return {
            ok: true,
            json: async () => ({
              category: "museum",
              source: "wikidata",
              places: [
                {
                  id: "Q160236",
                  name: "Metropolitan Museum of Art",
                  lat: 40.7794,
                  lng: -73.9632,
                },
              ],
            }),
          };
        }

        throw new Error(`Unexpected fetch: ${String(input)}`);
      }),
    );

    const places = await fetchBundledMeasuringPlaces(
      sampleGameArea,
      "museum",
      "nyc",
    );

    expect(places).toEqual([
      {
        id: "Q160236",
        name: "Metropolitan Museum of Art",
        point: [40.7794, -73.9632] satisfies LatLngTuple,
      },
    ]);

    vi.stubGlobal("fetch", originalFetch);
    clearBundledPoiCacheForTests();
  });
});
