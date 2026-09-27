import { afterEach, describe, expect, it, vi } from "vitest";
import type { Feature, LineString } from "geojson";
import { geodesicLineBuffer } from "./geodesicLineBuffer";
import { loadPolygonGolden } from "./loadPolygonGolden";
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
    const coldGolden = loadPolygonGolden("halfPlane", "cold.json");
    const radarGolden = loadPolygonGolden("halfPlane", "radar-outside.json");
    const wasmBuildHalfPlanePolygon = vi.fn(async () => coldGolden);
    const wasmBuildRadarShadedRegion = vi.fn(async () => radarGolden);

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
    expect(half).toEqual(coldGolden);
    expect(wasmBuildHalfPlanePolygon).toHaveBeenCalledOnce();

    const radar = await dispatchRadarShadedRegion(
      [51.45, -0.15],
      400,
      gameArea,
      false,
      "wasm",
    );
    expect(radar).toEqual(radarGolden);
    expect(wasmBuildRadarShadedRegion).toHaveBeenCalledOnce();
  });

  it("mode wasm + geodesicLineBuffer not ready → TS result, WASM not called", async () => {
    vi.resetModules();
    vi.doMock("./kernelWasmReady", () => ({
      KERNEL_WASM_READY: {
        maskFromUnionInput: true,
        endGameMaskFromDisks: true,
        halfPlane: true,
        geodesicLineBuffer: false,
      },
      shouldUseWasm: () => false,
    }));
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
});
