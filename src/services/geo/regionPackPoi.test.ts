import { describe, expect, it, vi } from "vitest";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import type { MeasuringPlace } from "../../domain/geo/types";
import type { TentaclePoi } from "../../domain/map/annotations";
import {
  fetchBundledTentaclePois,
  mergeMeasuringPlaces,
  mergeTentaclePois,
} from "./regionPackPoi";

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

  it("merges bundled tentacle pois without duplicating overpass names", () => {
    const overpass: TentaclePoi[] = [
      {
        id: "1",
        name: "British Museum",
        lat: 51.5194,
        lng: -0.127,
        category: "museum",
      },
    ];
    const bundled: TentaclePoi[] = [
      {
        id: "Q6373",
        name: "British Museum",
        lat: 51.5194,
        lng: -0.127,
        category: "museum",
      },
      {
        id: "Q180857",
        name: "Wellcome Collection",
        lat: 51.5258,
        lng: -0.1339,
        category: "museum",
      },
    ];

    const merged = mergeTentaclePois(overpass, bundled);
    expect(merged).toHaveLength(2);
    expect(merged.map((poi) => poi.name)).toEqual([
      "British Museum",
      "Wellcome Collection",
    ]);
  });

  it("loads portland-maine park bundle when present", async () => {
    const { fetchBundledMeasuringPlaces, clearBundledPoiCacheForTests } =
      await import("./regionPackPoi");

    clearBundledPoiCacheForTests();

    const parkBundleUrl = "/geo/portland-maine/poi/park.json";
    const originalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === parkBundleUrl) {
          return {
            ok: true,
            json: async () => ({
              category: "park",
              source: "wikidata+portland_gis",
              places: [
                {
                  id: "pme:deering-oaks",
                  name: "Deering Oaks",
                  lat: 43.659,
                  lng: -70.2708,
                },
              ],
            }),
          };
        }

        throw new Error(`Unexpected fetch: ${String(input)}`);
      }),
    );

    const portlandGameArea = {
      type: "Polygon" as const,
      coordinates: [
        [
          [-70.45, 43.55],
          [-70.1, 43.55],
          [-70.1, 43.75],
          [-70.45, 43.75],
          [-70.45, 43.55],
        ],
      ],
    };

    const places = await fetchBundledMeasuringPlaces(
      portlandGameArea,
      "park",
      "portland-maine",
    );

    expect(places).toEqual([
      {
        id: "pme:deering-oaks",
        name: "Deering Oaks",
        point: [43.659, -70.2708] satisfies LatLngTuple,
      },
    ]);

    vi.stubGlobal("fetch", originalFetch);
    clearBundledPoiCacheForTests();
  });

  it("loads bundled tentacle pois within search radius", async () => {
    const { clearBundledPoiCacheForTests } = await import("./regionPackPoi");

    clearBundledPoiCacheForTests();

    const museumBundleUrl = "/geo/london/poi/museum.json";
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
                  id: "Q6373",
                  name: "British Museum",
                  lat: 51.5194,
                  lng: -0.127,
                },
                {
                  id: "Q152087",
                  name: "Tate Modern",
                  lat: 51.5076,
                  lng: -0.0994,
                },
              ],
            }),
          };
        }

        throw new Error(`Unexpected fetch: ${String(input)}`);
      }),
    );

    const center: LatLngTuple = [51.5194, -0.127];
    const pois = await fetchBundledTentaclePois(
      center,
      500,
      "museum",
      "london",
    );

    expect(pois).toEqual([
      {
        id: "Q6373",
        name: "British Museum",
        lat: 51.5194,
        lng: -0.127,
        category: "museum",
      },
    ]);

    vi.stubGlobal("fetch", originalFetch);
    clearBundledPoiCacheForTests();
  });

  it("loads prince-rupert museum bundle when present", async () => {
    const { fetchBundledMeasuringPlaces, clearBundledPoiCacheForTests } =
      await import("./regionPackPoi");

    clearBundledPoiCacheForTests();

    const museumBundleUrl = "/geo/prince-rupert/poi/museum.json";
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
                  id: "Q123",
                  name: "Museum of Northern BC",
                  lat: 54.315,
                  lng: -130.32,
                },
              ],
            }),
          };
        }

        throw new Error(`Unexpected fetch: ${String(input)}`);
      }),
    );

    const princeRupertGameArea = {
      type: "Polygon" as const,
      coordinates: [
        [
          [-130.45, 54.25],
          [-130.2, 54.25],
          [-130.2, 54.4],
          [-130.45, 54.4],
          [-130.45, 54.25],
        ],
      ],
    };

    const places = await fetchBundledMeasuringPlaces(
      princeRupertGameArea,
      "museum",
      "prince-rupert",
    );

    expect(places).toEqual([
      {
        id: "Q123",
        name: "Museum of Northern BC",
        point: [54.315, -130.32] satisfies LatLngTuple,
      },
    ]);

    vi.stubGlobal("fetch", originalFetch);
    clearBundledPoiCacheForTests();
  });
});
