import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import turfCircle from "@turf/circle";
import turfDestination from "@turf/destination";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, LineString } from "geojson";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameArea } from "../../map/annotations";
import {
  buildLocationNearRegion,
  coastlineSegmentsFingerprint,
  distanceBetweenPoints,
} from "./nearRegions";

const sampleGameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-0.3, 51.3],
      [0.1, 51.3],
      [0.1, 51.6],
      [-0.3, 51.6],
      [-0.3, 51.3],
    ],
  ],
};

describe("buildLocationNearRegion disk steps", () => {
  it("includes a geodesic-inside point that a 16-step chord would exclude", () => {
    const target: [number, number] = [51.45, -0.15];
    const distanceMeters = 4_147;
    const center = turfPoint([-0.15, 51.45]);

    // Midway between two vertices of a regular n-gon; chords cut inside the true circle.
    const bearingMidChordDegrees = 360 / 16 / 2;
    const coarseChordFraction = Math.cos(Math.PI / 16);
    const probeFraction = (coarseChordFraction + Math.cos(Math.PI / 64)) / 2;
    const probe = turfDestination(
      center,
      (distanceMeters * probeFraction) / 1000,
      bearingMidChordDegrees,
      { units: "kilometers" },
    );
    const probeLngLat = probe.geometry.coordinates;
    const probeLatLng: [number, number] = [probeLngLat[1], probeLngLat[0]];

    expect(distanceBetweenPoints(target, probeLatLng)).toBeLessThan(distanceMeters);

    const coarseDisk = turfCircle(center, distanceMeters / 1000, {
      steps: 16,
      units: "kilometers",
    });
    expect(booleanPointInPolygon(probe, coarseDisk)).toBe(false);

    const nearRegion = buildLocationNearRegion(target, distanceMeters, sampleGameArea);
    expect(nearRegion).not.toBeNull();
    expect(booleanPointInPolygon(probe, nearRegion!)).toBe(true);
  });
});

describe("coastlineSegmentsFingerprint", () => {
  it("differs for same-count polylines with different geometry", () => {
    const left: Feature<LineString>[] = [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [-0.2, 51.4],
            [-0.1, 51.4],
          ],
        },
      },
    ];
    const right: Feature<LineString>[] = [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [-0.2, 51.5],
            [-0.1, 51.5],
          ],
        },
      },
    ];

    expect(left).toHaveLength(right.length);
    expect(coastlineSegmentsFingerprint(left)).not.toBe(coastlineSegmentsFingerprint(right));
  });
});

describe("buildCoastlineNearRegion fail-closed", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("../kernel/kernelWasmReady");
    vi.doUnmock("../kernel/nearRegionKernelRunner");
  });

  const coastSegment: Feature<LineString> = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [
        [-0.2, 51.4],
        [-0.1, 51.4],
      ],
    },
  };

  it("returns null when wasm nearRegionBatch throws (no TS distance-threshold)", async () => {
    vi.resetModules();
    vi.doMock("../kernel/kernelWasmReady", async () => {
      const actual = await vi.importActual<typeof import("../kernel/kernelWasmReady")>(
        "../kernel/kernelWasmReady",
      );
      return {
        ...actual,
        KERNEL_WASM_READY: {
          ...actual.KERNEL_WASM_READY,
          nearRegionBatch: true,
        },
        shouldUseWasm: (entrypoint: string) => {
          if (entrypoint === "nearRegionBatch") {
            return true;
          }
          return actual.shouldUseWasm(entrypoint as never);
        },
      };
    });
    vi.doMock("../kernel/nearRegionKernelRunner", () => ({
      dispatchNearRegionBatch: vi.fn(async () => {
        throw new Error("wasm boom");
      }),
    }));

    const { buildCoastlineNearRegion, clearCoastlineNearRegionCacheForTests } = await import(
      "./nearRegions"
    );
    clearCoastlineNearRegionCacheForTests();

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await buildCoastlineNearRegion([coastSegment], 1_000, sampleGameArea);
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      "[geometry] coastline near-region wasm failed; returning null",
      expect.any(Error),
    );
    warn.mockRestore();
  });

  it("returns null when nearRegionBatch wasm is disabled (no TS path)", async () => {
    vi.resetModules();
    vi.doMock("../kernel/kernelWasmReady", async () => {
      const actual = await vi.importActual<typeof import("../kernel/kernelWasmReady")>(
        "../kernel/kernelWasmReady",
      );
      return {
        ...actual,
        KERNEL_WASM_READY: {
          ...actual.KERNEL_WASM_READY,
          nearRegionBatch: false,
        },
        shouldUseWasm: (entrypoint: string) => {
          if (entrypoint === "nearRegionBatch") {
            return false;
          }
          return actual.shouldUseWasm(entrypoint as never);
        },
      };
    });

    const { buildCoastlineNearRegion, clearCoastlineNearRegionCacheForTests } = await import(
      "./nearRegions"
    );
    clearCoastlineNearRegionCacheForTests();

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await buildCoastlineNearRegion([coastSegment], 1_000, sampleGameArea);
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      "[geometry] coastline near-region wasm failed; returning null",
      expect.any(Error),
    );
    warn.mockRestore();
  });
});

describe("unionBufferedFeaturesInSlices fail-closed", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("../progressive/unionSlices");
    vi.doUnmock("./geodesicLineBuffer");
  });

  it("returns null when buffered union wasm throws (no MultiPolygon shell)", async () => {
    vi.resetModules();
    vi.doMock("./geodesicLineBuffer", () => ({
      dispatchGeodesicLineBuffer: vi.fn(async () => ({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-0.15, 51.45],
              [-0.14, 51.45],
              [-0.14, 51.46],
              [-0.15, 51.46],
              [-0.15, 51.45],
            ],
          ],
        },
      })),
    }));
    vi.doMock("../progressive/unionSlices", () => ({
      POLYGON_UNION_SLICE_BATCH: 8,
      unionPolygonFeaturesInSlices: vi.fn(async () => {
        throw new Error("wasm boom");
      }),
    }));

    const { buildCoastlineNearRegionUnionBufferForTests, clearCoastlineNearRegionCacheForTests } =
      await import("./nearRegions");
    clearCoastlineNearRegionCacheForTests();

    const segments: Feature<LineString>[] = [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [-0.2, 51.45],
            [-0.19, 51.45],
          ],
        },
      },
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [-0.18, 51.45],
            [-0.17, 51.45],
          ],
        },
      },
    ];

    const result = await buildCoastlineNearRegionUnionBufferForTests(
      segments,
      1_000,
      sampleGameArea,
    );
    expect(result).toBeNull();
  });
});
