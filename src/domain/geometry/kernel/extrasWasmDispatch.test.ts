import { afterEach, describe, expect, it, vi } from "vitest";
import type { Feature, LineString } from "geojson";
import { buildHalfPlanePolygon, buildRadarShadedRegion } from "./radarHalfPlane";
import { geodesicLineBuffer } from "./geodesicLineBuffer";
import type { GameAreaGeometry, LatLngTuple } from "./types";

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

const pointA: LatLngTuple = [51.45, -0.18];
const pointB: LatLngTuple = [51.46, -0.12];

const shortLine: Feature<LineString> = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "LineString",
    coordinates: [
      [-0.15, 51.45],
      [-0.14, 51.451],
    ],
  },
};

describe("extras wasm dispatch (halfPlane ready)", () => {
  afterEach(() => {
    vi.doUnmock("./halfPlaneWasm");
    vi.doUnmock("./geodesicWasm");
    vi.resetModules();
  });

  it("mode wasm + halfPlane ready → calls WASM", async () => {
    vi.resetModules();
    const wasmBuildHalfPlanePolygon = vi.fn(async () =>
      buildHalfPlanePolygon(pointA, pointB, gameArea, "cold"),
    );
    const wasmBuildRadarShadedRegion = vi.fn(async () =>
      buildRadarShadedRegion([51.45, -0.15], 400, gameArea, false),
    );

    vi.doMock("./halfPlaneWasm", () => ({
      wasmBuildHalfPlanePolygon,
      wasmBuildRadarShadedRegion,
      resetHalfPlaneWasmForTests: vi.fn(),
    }));

    const { dispatchHalfPlane, dispatchRadarShadedRegion } = await import(
      "./halfPlaneKernelRunner"
    );

    const half = await dispatchHalfPlane(
      pointA,
      pointB,
      gameArea,
      "cold",
      "midpoint",
      "wasm",
    );
    expect(half).toEqual(
      buildHalfPlanePolygon(pointA, pointB, gameArea, "cold"),
    );
    expect(wasmBuildHalfPlanePolygon).toHaveBeenCalledOnce();

    const radar = await dispatchRadarShadedRegion(
      [51.45, -0.15],
      400,
      gameArea,
      false,
      "wasm",
    );
    expect(radar).toEqual(
      buildRadarShadedRegion([51.45, -0.15], 400, gameArea, false),
    );
    expect(wasmBuildRadarShadedRegion).toHaveBeenCalledOnce();
  });

  it("mode dual + halfPlane ready → returns TS, still calls WASM", async () => {
    vi.resetModules();
    const wasmBuildHalfPlanePolygon = vi.fn(async () =>
      buildHalfPlanePolygon(pointA, pointB, gameArea, "hot"),
    );

    vi.doMock("./halfPlaneWasm", () => ({
      wasmBuildHalfPlanePolygon,
      wasmBuildRadarShadedRegion: vi.fn(),
      resetHalfPlaneWasmForTests: vi.fn(),
    }));

    const { dispatchHalfPlane } = await import("./halfPlaneKernelRunner");
    const expected = buildHalfPlanePolygon(pointA, pointB, gameArea, "cold");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const half = await dispatchHalfPlane(
      pointA,
      pointB,
      gameArea,
      "cold",
      "midpoint",
      "dual",
    );

    expect(half).toEqual(expected);
    expect(wasmBuildHalfPlanePolygon).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });

  it("mode wasm + geodesicLineBuffer not ready → TS result, WASM not called", async () => {
    vi.resetModules();
    const wasmGeodesicLineBuffer = vi.fn(async () => {
      throw new Error("should not call geodesic wasm");
    });

    vi.doMock("./geodesicWasm", () => ({
      wasmGeodesicLineBuffer,
      resetGeodesicWasmForTests: vi.fn(),
    }));

    const { dispatchGeodesicLineBuffer } = await import(
      "./geodesicKernelRunner"
    );
    const expected = geodesicLineBuffer(shortLine, 200);
    const result = await dispatchGeodesicLineBuffer(
      shortLine,
      200,
      undefined,
      "wasm",
    );
    expect(result).toEqual(expected);
    expect(wasmGeodesicLineBuffer).not.toHaveBeenCalled();
  });

  it("mode ts → never calls WASM for halfPlane", async () => {
    vi.resetModules();
    const wasmBuildHalfPlanePolygon = vi.fn(async () => {
      throw new Error("should not call half-plane wasm");
    });

    vi.doMock("./halfPlaneWasm", () => ({
      wasmBuildHalfPlanePolygon,
      wasmBuildRadarShadedRegion: vi.fn(),
      resetHalfPlaneWasmForTests: vi.fn(),
    }));

    const { dispatchHalfPlane } = await import("./halfPlaneKernelRunner");

    await dispatchHalfPlane(
      pointA,
      pointB,
      gameArea,
      "cold",
      "midpoint",
      "ts",
    );

    expect(wasmBuildHalfPlanePolygon).not.toHaveBeenCalled();
  });
});
