import type { Feature, LineString } from "geojson";
import type { PolygonFeature } from "./types";

type GeodesicWasmModule = {
  geodesic_line_buffer_json: (
    coordinatesJson: string,
    distanceMeters: number,
    sampleSpacingMeters?: number | null,
  ) => unknown;
};

let wasmModulePromise: Promise<GeodesicWasmModule> | null = null;

function isPolygonFeature(value: unknown): value is PolygonFeature {
  if (value == null || typeof value !== "object") {
    return false;
  }
  const feature = value as { type?: unknown; geometry?: unknown };
  if (feature.type !== "Feature") {
    return false;
  }
  if (feature.geometry == null || typeof feature.geometry !== "object") {
    return false;
  }
  const geometryType = (feature.geometry as { type?: unknown }).type;
  return geometryType === "Polygon" || geometryType === "MultiPolygon";
}

function parseWasmFeature(result: unknown): PolygonFeature | null {
  if (result == null) {
    return null;
  }
  if (typeof result === "string") {
    if (result.length === 0) {
      return null;
    }
    const parsed: unknown = JSON.parse(result);
    return isPolygonFeature(parsed) ? parsed : null;
  }
  return isPolygonFeature(result) ? result : null;
}

async function loadGeodesicWasm(): Promise<GeodesicWasmModule> {
  if (!wasmModulePromise) {
    wasmModulePromise = import(
      "../../../../crates/jetlag-geometry-kernel/pkg/jetlag_geometry_kernel.js"
    ) as Promise<GeodesicWasmModule>;
  }
  return wasmModulePromise;
}

/** Reset lazy WASM module (tests). */
export function resetGeodesicWasmForTests(): void {
  wasmModulePromise = null;
}

export async function wasmGeodesicLineBuffer(
  segment: Feature<LineString>,
  distanceMeters: number,
  sampleSpacingMeters?: number,
): Promise<PolygonFeature | null> {
  const wasm = await loadGeodesicWasm();
  const result = wasm.geodesic_line_buffer_json(
    JSON.stringify(segment.geometry.coordinates),
    distanceMeters,
    sampleSpacingMeters ?? null,
  );
  return parseWasmFeature(result);
}
