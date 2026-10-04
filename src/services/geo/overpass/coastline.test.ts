import type { Feature, LineString } from "geojson";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameArea } from "@/domain/map/annotations";
import * as overpassClient from "../../core/overpass/overpassClient";
import { clearGeographicFeatureCacheForTests } from "../cache";
import {
  fetchCoastlineSegments,
  fetchPreparedCoastlineSegments,
  getCachedPreparedCoastlineSegments,
  loadCoastlineContext,
} from "./coastline";
import { clearBundledCoastlineCacheForTests } from "./regionPackCoastline";

const sampleGameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-6.4, 53.3],
      [-6.2, 53.3],
      [-6.2, 53.4],
      [-6.4, 53.4],
      [-6.4, 53.3],
    ],
  ],
};

const packSegment: Feature<LineString> = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "LineString",
    coordinates: [
      [-6.38, 53.32],
      [-6.3, 53.33],
    ],
  },
};

describe("coastline lookup", () => {
  afterEach(async () => {
    await clearGeographicFeatureCacheForTests();
    clearBundledCoastlineCacheForTests();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  beforeEach(async () => {
    await clearGeographicFeatureCacheForTests();
    clearBundledCoastlineCacheForTests();
  });

  it("parses coastline ways from Overpass", async () => {
    vi.spyOn(overpassClient, "queryOverpass").mockResolvedValue({
      elements: [
        {
          type: "way",
          geometry: [
            { lat: 53.35, lon: -6.35 },
            { lat: 53.36, lon: -6.34 },
          ],
        },
      ],
    });

    const segments = await fetchCoastlineSegments(sampleGameArea);

    expect(segments).toHaveLength(1);
    expect(segments[0]?.geometry.coordinates).toEqual([
      [-6.35, 53.35],
      [-6.34, 53.36],
    ]);
  });

  it("reuses cached coastline segments for the same play area", async () => {
    const queryOverpass = vi.spyOn(overpassClient, "queryOverpass").mockResolvedValue({
      elements: [
        {
          type: "way",
          geometry: [
            { lat: 53.35, lon: -6.35 },
            { lat: 53.36, lon: -6.34 },
          ],
        },
      ],
    });

    await fetchCoastlineSegments(sampleGameArea);
    await fetchCoastlineSegments(sampleGameArea);

    expect(queryOverpass).toHaveBeenCalledTimes(1);
  });

  it("loadCoastlineContext returns pack segments before enrich writes cache", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          source: "overpass",
          segments: [packSegment],
        }),
      })),
    );

    vi.spyOn(overpassClient, "queryOverpass").mockImplementation(() => new Promise(() => {}));

    const enrich = vi.fn();
    const context = await loadCoastlineContext([53.35, -6.26], sampleGameArea, {
      regionPackId: "dublin",
      onEnrich: enrich,
    });

    expect(context?.segments).toHaveLength(1);
    expect(getCachedPreparedCoastlineSegments(sampleGameArea)).toBeUndefined();
    expect(enrich).not.toHaveBeenCalled();
  });

  it("resolves from the pack without awaiting slow Overpass when onEnrich is set", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          source: "overpass",
          segments: [packSegment],
        }),
      })),
    );

    let resolveOverpass: ((value: unknown) => void) | undefined;
    const queryOverpass = vi.spyOn(overpassClient, "queryOverpass").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveOverpass = resolve;
        }),
    );

    const enrich = vi.fn();
    const prepared = await fetchPreparedCoastlineSegments(sampleGameArea, {
      regionPackId: "dublin",
      onEnrich: enrich,
    });

    expect(prepared.segments).toHaveLength(1);
    expect(prepared.segments[0]?.geometry.coordinates).toEqual(packSegment.geometry.coordinates);
    expect(queryOverpass).toHaveBeenCalledTimes(1);
    expect(enrich).not.toHaveBeenCalled();

    resolveOverpass?.({
      elements: [
        {
          type: "way",
          geometry: [
            { lat: 53.35, lon: -6.35 },
            { lat: 53.36, lon: -6.34 },
          ],
        },
      ],
    });
    await vi.waitFor(() => {
      expect(enrich).toHaveBeenCalledTimes(1);
    });
  });

  it("skips Overpass for inland packs with source none", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          source: "none",
          segments: [],
        }),
      })),
    );
    const queryOverpass = vi.spyOn(overpassClient, "queryOverpass");

    const prepared = await fetchPreparedCoastlineSegments(sampleGameArea, {
      regionPackId: "zurich",
      onEnrich: vi.fn(),
    });

    expect(prepared.segments).toEqual([]);
    expect(queryOverpass).not.toHaveBeenCalled();
  });

  it("splits a too-expensive full AABB into child bboxes", async () => {
    const queryOverpass = vi
      .spyOn(overpassClient, "queryOverpass")
      .mockRejectedValueOnce(new overpassClient.OverpassQueryTooExpensiveError())
      .mockResolvedValue({
        elements: [
          {
            type: "way",
            id: 1,
            geometry: [
              { lat: 53.35, lon: -6.35 },
              { lat: 53.36, lon: -6.34 },
            ],
          },
        ],
      });

    const segments = await fetchCoastlineSegments(sampleGameArea);

    expect(queryOverpass.mock.calls.length).toBeGreaterThan(1);
    expect(segments.length).toBeGreaterThan(0);
  });

  it("does not split OverpassUnavailableError", async () => {
    const queryOverpass = vi
      .spyOn(overpassClient, "queryOverpass")
      .mockRejectedValue(new overpassClient.OverpassUnavailableError());

    await expect(fetchCoastlineSegments(sampleGameArea)).rejects.toBeInstanceOf(
      overpassClient.OverpassUnavailableError,
    );
    expect(queryOverpass).toHaveBeenCalledTimes(1);
  });
});
