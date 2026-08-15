import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameArea } from "@/domain/map/annotations";
import {
  DUBLIN_CITY_GAME_AREA,
  DUBLIN_COUNTY_GAME_AREA,
} from "@/test/fixtures/dublinGameArea";
import * as overpassClient from "../../core/overpass/overpassClient";
import {
  deserializeMatchingFeatures,
  pickNearestMatchingFeature,
  serializeMatchingFeatures,
} from "@/domain/geo/matchingAdapters";
import {
  reconcileLockedMatchingNearest,
  shouldApplyMatchingAnchorPhase,
} from "@/hooks/tools/matching/resolveMatchingAnchor";
import { clearGeographicFeatureCacheForTests } from "../cache";
import { formatOverpassBboxFromGameArea } from "../overpass/queryHelpers";
import { clearBundledPoiCacheForTests } from "../overpass/regionPackPoi";
import {
  fetchMatchingFeaturesInArea,
  findNearestMatchingFeature,
  parseMatchingFeatures,
  matchingNullAnswerMessage,
  matchingFeatureCountLabel,
} from "./index";

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

const DUBLIN_AIRPORT_PACK_POI = {
  id: "Q178021",
  name: "Dublin Airport",
  lat: 53.421388888,
  lng: -6.27,
};

function stubDublinAirportPackFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "/geo/dublin/poi/commercial_airport.json") {
        return {
          ok: true,
          json: async () => ({
            category: "commercial_airport",
            source: "wikidata",
            places: [DUBLIN_AIRPORT_PACK_POI],
          }),
        };
      }
      throw new Error(`Unexpected fetch: ${String(input)}`);
    }),
  );
}

describe("matching features", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    clearBundledPoiCacheForTests();
    await clearGeographicFeatureCacheForTests();
  });

  it("loads museums inside the play area and picks the nearest", async () => {
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
          lat: 50,
          lon: -1.5,
        },
      ],
    });

    const features = await fetchMatchingFeaturesInArea(
      sampleGameArea,
      "museum",
    );

    expect(features).toHaveLength(2);
    expect(features.every((feature) => feature.inPlayArea)).toBe(true);

    const nearest = await findNearestMatchingFeature(
      [51.46, -0.15],
      sampleGameArea,
      "museum",
    );

    expect(nearest?.name).toBe("Near Museum");
    expect(nearest?.distanceMeters).toBeGreaterThan(0);
  });

  it("resolves from the pack without awaiting slow Overpass when onEnrich is set", async () => {
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
    const featuresPromise = fetchMatchingFeaturesInArea(
      sampleGameArea,
      "museum",
      { regionPackId: "london", onEnrich: enrich },
    );

    const features = await featuresPromise;
    expect(features).toEqual([
      {
        id: "Q6373",
        name: "British Museum",
        point: [51.45, -0.16],
        inPlayArea: true,
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
    expect(enriched.map((feature: { name: string }) => feature.name)).toEqual([
      "Science Museum",
      "British Museum",
    ]);
  });

  it("awaits Overpass when the pack is empty or missing", async () => {
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

    const enrich = vi.fn();
    const features = await fetchMatchingFeaturesInArea(
      sampleGameArea,
      "museum",
      { regionPackId: "london", onEnrich: enrich },
    );

    expect(queryOverpass).toHaveBeenCalled();
    expect(enrich).not.toHaveBeenCalled();
    expect(features).toEqual([
      {
        id: "7",
        name: "Live Museum",
        point: [51.45, -0.16],
        inPlayArea: true,
      },
    ]);
  });

  it("ignores a stale enrich phase after a newer phase for the same request", () => {
    expect(shouldApplyMatchingAnchorPhase(-1, 0)).toBe(true);
    expect(shouldApplyMatchingAnchorPhase(0, 1)).toBe(true);
    expect(shouldApplyMatchingAnchorPhase(1, 0)).toBe(false);
    expect(shouldApplyMatchingAnchorPhase(1, 1)).toBe(true);
  });

  it("remaps locked nearest pack id to Overpass id after name-dedupe enrich", () => {
    const reconciled = reconcileLockedMatchingNearest(
      [
        {
          id: "99",
          name: "British Museum",
          point: [51.45, -0.16],
          inPlayArea: true,
        },
        {
          id: "100",
          name: "Science Museum",
          point: [51.44, -0.17],
          inPlayArea: true,
        },
      ],
      "Q6373",
      "British Museum",
    );

    expect(reconciled).toEqual({
      nearestFeatureId: "99",
      nearestFeatureName: "British Museum",
      nearestFeaturePoint: [51.45, -0.16],
    });
  });

  it("keeps locked nearest when enrich cannot remap the venue", () => {
    expect(
      reconcileLockedMatchingNearest(
        [
          {
            id: "100",
            name: "Science Museum",
            point: [51.44, -0.17],
            inPlayArea: true,
          },
        ],
        "Q6373",
        "British Museum",
      ),
    ).toBeNull();
  });

  it("accepts english fallback names when name is missing", () => {
    const features = parseMatchingFeatures(
      [
        {
          id: 4,
          tags: { tourism: "museum", "name:en": "City Museum" },
          lat: 51.45,
          lon: -0.16,
        },
      ],
      sampleGameArea,
      "museum",
    );

    expect(features).toEqual([
      {
        id: "4",
        name: "City Museum",
        point: [51.45, -0.16],
        inPlayArea: true,
      },
    ]);
  });

  it("excludes commercial airports outside the play area", async () => {
    vi.spyOn(overpassClient, "queryOverpass").mockResolvedValue({
      elements: [
        {
          id: 10,
          tags: { name: "Dublin Airport", aeroway: "aerodrome", iata: "DUB" },
          lat: 53.421,
          lon: -6.27,
        },
      ],
    });

    const features = await fetchMatchingFeaturesInArea(
      DUBLIN_CITY_GAME_AREA,
      "commercial_airport",
    );

    expect(features).toEqual([]);

    const nearest = await findNearestMatchingFeature(
      [53.35, -6.26],
      DUBLIN_CITY_GAME_AREA,
      "commercial_airport",
    );

    expect(nearest).toBeNull();
  });

  describe("dublin pack attach dual-phase", () => {
    const expectedDublinAirportFeature = {
      id: DUBLIN_AIRPORT_PACK_POI.id,
      name: DUBLIN_AIRPORT_PACK_POI.name,
      point: [DUBLIN_AIRPORT_PACK_POI.lat, DUBLIN_AIRPORT_PACK_POI.lng] as [
        number,
        number,
      ],
      inPlayArea: true,
    };

    beforeEach(() => {
      stubDublinAirportPackFetch();
    });

    it("county play area returns bundled DUB immediately", async () => {
      let resolveOverpass: ((value: { elements: unknown[] }) => void) | undefined;
      vi.spyOn(overpassClient, "queryOverpass").mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveOverpass = resolve;
          }),
      );

      const enrich = vi.fn();
      const features = await fetchMatchingFeaturesInArea(
        DUBLIN_COUNTY_GAME_AREA,
        "commercial_airport",
        { regionPackId: "dublin", onEnrich: enrich },
      );

      expect(features).toEqual([expectedDublinAirportFeature]);
      expect(enrich).not.toHaveBeenCalled();
      await vi.waitFor(() => {
        expect(resolveOverpass).toBeTypeOf("function");
      });
      resolveOverpass?.({ elements: [] });
      await vi.waitFor(() => {
        expect(enrich).toHaveBeenCalledTimes(1);
      });
    });

    it("city play area excludes DUB and awaits Overpass", async () => {
      const queryOverpass = vi
        .spyOn(overpassClient, "queryOverpass")
        .mockResolvedValue({ elements: [] });

      const enrich = vi.fn();
      const features = await fetchMatchingFeaturesInArea(
        DUBLIN_CITY_GAME_AREA,
        "commercial_airport",
        { regionPackId: "dublin", onEnrich: enrich },
      );

      expect(queryOverpass).toHaveBeenCalled();
      expect(features).toEqual([]);
      expect(enrich).not.toHaveBeenCalled();
    });

    it("enrich Overpass query bbox matches the play area", async () => {
      const expectedBbox = formatOverpassBboxFromGameArea(
        DUBLIN_COUNTY_GAME_AREA,
      );
      let resolveOverpass: ((value: { elements: unknown[] }) => void) | undefined;
      const queryOverpass = vi
        .spyOn(overpassClient, "queryOverpass")
        .mockImplementation((query: string) => {
          expect(query).toContain(expectedBbox);
          return new Promise((resolve) => {
            resolveOverpass = resolve;
          });
        });

      const enrich = vi.fn();
      const features = await fetchMatchingFeaturesInArea(
        DUBLIN_COUNTY_GAME_AREA,
        "commercial_airport",
        { regionPackId: "dublin", onEnrich: enrich },
      );

      expect(features).toEqual([expectedDublinAirportFeature]);

      await vi.waitFor(() => {
        expect(queryOverpass).toHaveBeenCalled();
      });

      resolveOverpass?.({
        elements: [
          {
            id: 99,
            tags: {
              name: "Outside Airport",
              aeroway: "aerodrome",
              iata: "XXX",
            },
            lat: 54.5,
            lon: -7.5,
          },
          {
            id: 100,
            tags: {
              name: "Enrich Airport",
              aeroway: "aerodrome",
              iata: "ENR",
            },
            lat: 53.35,
            lon: -6.26,
          },
        ],
      });

      await vi.waitFor(() => {
        expect(enrich).toHaveBeenCalledTimes(1);
      });

      const enriched = enrich.mock.calls[0]?.[0] ?? [];
      expect(
        enriched.map((feature: { name: string }) => feature.name).sort(),
      ).toEqual(["Dublin Airport", "Enrich Airport"]);
    });
  });

  it("builds feature count labels for play-area features", () => {
    expect(
      matchingFeatureCountLabel(3, 1, false, false),
    ).toBe("3 features (1 in play area, 2 nearby)");
    expect(
      matchingFeatureCountLabel(2, 2, false, false),
    ).toBe("2 features in play area");
  });

  it("describes null answers with category-specific guidance", () => {
    expect(matchingNullAnswerMessage("commercial_airport")).toContain(
      "commercial airport",
    );
    expect(matchingNullAnswerMessage("museum")).toContain("museum");
    expect(matchingNullAnswerMessage("landmass")).toContain("landmass");
  });

  it("drops unnamed venues and honorary consulates", () => {
    const features = parseMatchingFeatures(
      [
        {
          id: 1,
          tags: { tourism: "zoo" },
          lat: 51.45,
          lon: -0.16,
        },
        {
          id: 2,
          tags: {
            name: "Honorary Consulate",
            office: "diplomatic",
            diplomatic: "consulate",
          },
          lat: 51.45,
          lon: -0.17,
        },
        {
          id: 3,
          tags: {
            name: "US Consulate",
            office: "diplomatic",
            diplomatic: "consulate",
          },
          lat: 51.45,
          lon: -0.18,
        },
      ],
      sampleGameArea,
      "foreign_consulate",
    );

    expect(features).toEqual([
      {
        id: "3",
        name: "US Consulate",
        point: [51.45, -0.18],
        inPlayArea: true,
      },
    ]);
  });

  it("breaks nearest-feature ties by feature id", () => {
    const nearest = pickNearestMatchingFeature(
      [51.45, -0.16],
      [
        {
          id: "b",
          name: "B",
          point: [51.45, -0.161],
        },
        {
          id: "a",
          name: "A",
          point: [51.45, -0.161],
        },
      ],
    );

    expect(nearest?.id).toBe("a");
  });

  it("round-trips serialized feature lists", () => {
    const features = [
      {
        id: "1",
        name: "City Zoo",
        point: [51.45, -0.18] as [number, number],
      },
    ];

    expect(
      deserializeMatchingFeatures(serializeMatchingFeatures(features)),
    ).toEqual(features);
  });
});
