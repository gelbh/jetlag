import { beforeAll, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Feature, LineString } from "geojson";
import {
  buildEndGameMaskFromDisks,
  buildMaskFromUnionInput,
} from "./buildMask";
import { geodesicLineBuffer } from "./geodesicLineBuffer";
import { maskTopologyMatches } from "./maskTopology";
import {
  buildHalfPlanePolygon,
  buildRadarShadedRegion,
} from "./radarHalfPlane";
import type {
  DiskSpec,
  GameAreaGeometry,
  LatLngTuple,
  PolygonFeature,
} from "./types";

const pkgEntry = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../crates/jetlag-geometry-kernel/pkg/jetlag_geometry_kernel.js",
);
const wasmPkgReady = existsSync(pkgEntry);

const gameArea: GameAreaGeometry = {
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

/** Inset from game-area edges: turf vs geo disagree on exact boundary PIP. */
const gameBbox = {
  west: -0.199,
  east: -0.101,
  south: 51.401,
  north: 51.499,
};

const geodesicBbox = {
  west: -0.18,
  east: -0.12,
  south: 51.43,
  north: 51.47,
};

function square(west: number): PolygonFeature {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [west, 51.42],
          [west + 0.03, 51.42],
          [west + 0.03, 51.48],
          [west, 51.48],
          [west, 51.42],
        ],
      ],
    },
  };
}

function lineFeature(
  coordinates: [number, number][],
): Feature<LineString> {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates },
  };
}

type GoldenCase = {
  id: string;
  bbox: { west: number; east: number; south: number; north: number };
  run: () => Promise<{ ts: PolygonFeature | null; wasm: PolygonFeature | null }>;
};

describe.skipIf(!wasmPkgReady)("Gate B dual golden parity", () => {
  let wasmBuildMaskFromUnionInput: typeof import("./maskWasm").wasmBuildMaskFromUnionInput;
  let wasmBuildEndGameMaskFromDisks: typeof import("./maskWasm").wasmBuildEndGameMaskFromDisks;
  let wasmBuildHalfPlanePolygon: typeof import("./halfPlaneWasm").wasmBuildHalfPlanePolygon;
  let wasmBuildRadarShadedRegion: typeof import("./halfPlaneWasm").wasmBuildRadarShadedRegion;
  let wasmGeodesicLineBuffer: typeof import("./geodesicWasm").wasmGeodesicLineBuffer;

  beforeAll(async () => {
    const mask = await import("./maskWasm");
    const half = await import("./halfPlaneWasm");
    const geo = await import("./geodesicWasm");
    wasmBuildMaskFromUnionInput = mask.wasmBuildMaskFromUnionInput;
    wasmBuildEndGameMaskFromDisks = mask.wasmBuildEndGameMaskFromDisks;
    wasmBuildHalfPlanePolygon = half.wasmBuildHalfPlanePolygon;
    wasmBuildRadarShadedRegion = half.wasmBuildRadarShadedRegion;
    wasmGeodesicLineBuffer = geo.wasmGeodesicLineBuffer;
    // Warm WASM once so fixture timings are not cold-start dominated.
    await wasmBuildMaskFromUnionInput({ polygons: [], disks: [] }, gameArea);
  }, 60_000);

  const thermoPairs: Array<{
    id: string;
    a: LatLngTuple;
    b: LatLngTuple;
    side: "hot" | "cold";
    anchor: "midpoint" | "start";
  }> = [
    {
      id: "halfPlane-cold-mid-thermo",
      a: [51.45, -0.18],
      b: [51.46, -0.12],
      side: "cold",
      anchor: "midpoint",
    },
    {
      id: "halfPlane-hot-mid-thermo",
      a: [51.45, -0.18],
      b: [51.46, -0.12],
      side: "hot",
      anchor: "midpoint",
    },
    {
      id: "halfPlane-cold-start-thermo",
      a: [51.45, -0.18],
      b: [51.46, -0.12],
      side: "cold",
      anchor: "start",
    },
    {
      id: "halfPlane-hot-start-thermo",
      a: [51.45, -0.18],
      b: [51.46, -0.12],
      side: "hot",
      anchor: "start",
    },
    {
      // Slight EW offset — pure NS meridian can disagree on boundary PIP.
      id: "halfPlane-cold-mid-ns-tilt",
      a: [51.42, -0.151],
      b: [51.48, -0.149],
      side: "cold",
      anchor: "midpoint",
    },
    {
      id: "halfPlane-cold-start-shifted",
      a: [51.44, -0.17],
      b: [51.47, -0.13],
      side: "cold",
      anchor: "start",
    },
    {
      id: "halfPlane-cold-mid-diag",
      a: [51.42, -0.19],
      b: [51.48, -0.11],
      side: "cold",
      anchor: "midpoint",
    },
    {
      id: "halfPlane-hot-start-diag",
      a: [51.42, -0.11],
      b: [51.48, -0.19],
      side: "hot",
      anchor: "start",
    },
  ];

  const radarCases: Array<{
    id: string;
    center: LatLngTuple;
    radiusMeters: number;
    shadedInside: boolean;
  }> = [
    {
      id: "radar-outside-400",
      center: [51.45, -0.15],
      radiusMeters: 400,
      shadedInside: false,
    },
    {
      id: "radar-inside-400",
      center: [51.45, -0.15],
      radiusMeters: 400,
      shadedInside: true,
    },
    {
      id: "radar-outside-250",
      center: [51.44, -0.16],
      radiusMeters: 250,
      shadedInside: false,
    },
    {
      id: "radar-inside-600",
      center: [51.46, -0.14],
      radiusMeters: 600,
      shadedInside: true,
    },
  ];

  const maskUnionCases: Array<{ id: string; polygons: PolygonFeature[] }> = [
    { id: "mask-union-single-west", polygons: [square(-0.19)] },
    { id: "mask-union-single-mid", polygons: [square(-0.165)] },
    { id: "mask-union-two-overlap", polygons: [square(-0.19), square(-0.17)] },
    {
      id: "mask-union-three-overlap",
      polygons: [square(-0.19), square(-0.17), square(-0.15)],
    },
    { id: "mask-union-two-gap", polygons: [square(-0.19), square(-0.14)] },
  ];

  const endGameDiskCases: Array<{ id: string; disks: DiskSpec[] }> = [
    {
      id: "mask-endgame-disk-400",
      disks: [{ center: [51.45, -0.15], radiusMeters: 400 }],
    },
    {
      id: "mask-endgame-disk-300",
      disks: [{ center: [51.44, -0.16], radiusMeters: 300 }],
    },
    {
      id: "mask-endgame-disk-500",
      disks: [{ center: [51.46, -0.14], radiusMeters: 500 }],
    },
  ];

  const geodesicCases: Array<{
    id: string;
    line: Feature<LineString>;
    radiusMeters: number;
  }> = [
    {
      id: "geodesic-short-200",
      line: lineFeature([
        [-0.15, 51.45],
        [-0.14, 51.451],
      ]),
      radiusMeters: 200,
    },
    {
      id: "geodesic-short-150",
      line: lineFeature([
        [-0.15, 51.45],
        [-0.14, 51.451],
      ]),
      radiusMeters: 150,
    },
    {
      id: "geodesic-short-300",
      line: lineFeature([
        [-0.15, 51.45],
        [-0.14, 51.451],
      ]),
      radiusMeters: 300,
    },
    {
      id: "geodesic-ew-200",
      line: lineFeature([
        [-0.17, 51.45],
        [-0.13, 51.45],
      ]),
      radiusMeters: 200,
    },
    {
      id: "geodesic-ns-180",
      line: lineFeature([
        [-0.15, 51.44],
        [-0.15, 51.46],
      ]),
      radiusMeters: 180,
    },
    {
      id: "geodesic-diag-220",
      line: lineFeature([
        [-0.17, 51.44],
        [-0.13, 51.46],
      ]),
      radiusMeters: 220,
    },
  ];

  function buildFixtures(): GoldenCase[] {
    const fixtures: GoldenCase[] = [];

    for (const c of maskUnionCases) {
      fixtures.push({
        id: c.id,
        bbox: gameBbox,
        run: async () => {
          const input = { polygons: c.polygons, disks: [] };
          return {
            ts: buildMaskFromUnionInput(input, gameArea),
            wasm: await wasmBuildMaskFromUnionInput(input, gameArea),
          };
        },
      });
    }

    for (const c of endGameDiskCases) {
      fixtures.push({
        id: c.id,
        bbox: gameBbox,
        run: async () => ({
          ts: buildEndGameMaskFromDisks(gameArea, c.disks),
          wasm: await wasmBuildEndGameMaskFromDisks(gameArea, c.disks),
        }),
      });
    }

    for (const c of thermoPairs) {
      fixtures.push({
        id: c.id,
        bbox: gameBbox,
        run: async () => ({
          ts: buildHalfPlanePolygon(c.a, c.b, gameArea, c.side, c.anchor),
          wasm: await wasmBuildHalfPlanePolygon(
            c.a,
            c.b,
            gameArea,
            c.side,
            c.anchor,
          ),
        }),
      });
    }

    for (const c of radarCases) {
      fixtures.push({
        id: c.id,
        bbox: gameBbox,
        run: async () => ({
          ts: buildRadarShadedRegion(
            c.center,
            c.radiusMeters,
            gameArea,
            c.shadedInside,
          ),
          wasm: await wasmBuildRadarShadedRegion(
            c.center,
            c.radiusMeters,
            gameArea,
            c.shadedInside,
          ),
        }),
      });
    }

    for (const c of geodesicCases) {
      fixtures.push({
        id: c.id,
        bbox: geodesicBbox,
        run: async () => ({
          ts: geodesicLineBuffer(c.line, c.radiusMeters),
          wasm: await wasmGeodesicLineBuffer(c.line, c.radiusMeters),
        }),
      });
    }

    return fixtures;
  }

  it("has ≥20 fixtures covering mask, half-plane, and geodesic", () => {
    const fixtures = buildFixtures();
    expect(fixtures.length).toBeGreaterThanOrEqual(20);
    expect(fixtures.some((f) => f.id.startsWith("mask-"))).toBe(true);
    expect(fixtures.some((f) => f.id.startsWith("halfPlane-"))).toBe(true);
    expect(fixtures.some((f) => f.id.startsWith("radar-"))).toBe(true);
    expect(fixtures.some((f) => f.id.startsWith("geodesic-"))).toBe(true);
  });

  it("reports 0 topology mismatches across all dual goldens", async () => {
    const fixtures = buildFixtures();
    expect(fixtures.length).toBeGreaterThanOrEqual(20);

    const mismatches: string[] = [];
    for (const fixture of fixtures) {
      const { ts, wasm } = await fixture.run();
      if (!maskTopologyMatches(wasm, ts, fixture.bbox)) {
        mismatches.push(fixture.id);
      }
    }

    expect(mismatches).toEqual([]);
  }, 120_000);
});
