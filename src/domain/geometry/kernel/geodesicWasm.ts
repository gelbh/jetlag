import type { Feature, LineString } from "geojson";
import { loadKernelWasm, parseWasmFeature, resetKernelWasmForTests } from "./kernelWasmPkg";
import type { PolygonFeature } from "./types";

export const resetGeodesicWasmForTests = resetKernelWasmForTests;

export async function wasmGeodesicLineBuffer(
  segment: Feature<LineString>,
  distanceMeters: number,
  sampleSpacingMeters?: number,
): Promise<PolygonFeature | null> {
  if (
    sampleSpacingMeters !== undefined &&
    (!Number.isFinite(sampleSpacingMeters) || sampleSpacingMeters <= 0)
  ) {
    throw new RangeError("sampleSpacingMeters must be a positive finite number");
  }
  const wasm = await loadKernelWasm();
  const result = wasm.geodesic_line_buffer_json(
    JSON.stringify(segment.geometry.coordinates),
    distanceMeters,
    sampleSpacingMeters ?? null,
  );
  return parseWasmFeature(result);
}
