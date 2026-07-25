import {
  loadKernelWasm,
  parseWasmFeature,
  resetKernelWasmForTests,
} from "./kernelWasmPkg";
import type {
  GameAreaGeometry,
  LatLngTuple,
  PolygonFeature,
} from "./types";

/** Reset lazy WASM module (tests). */
export const resetHalfPlaneWasmForTests = resetKernelWasmForTests;

export async function wasmBuildHalfPlanePolygon(
  pointA: LatLngTuple,
  pointB: LatLngTuple,
  gameArea: GameAreaGeometry,
  shadedSide: "hot" | "cold" = "cold",
  divisionAnchor: "midpoint" | "start" = "midpoint",
): Promise<PolygonFeature | null> {
  const wasm = await loadKernelWasm();
  const result = wasm.build_half_plane_polygon_json(
    JSON.stringify(pointA),
    JSON.stringify(pointB),
    JSON.stringify(gameArea),
    shadedSide,
    divisionAnchor,
  );
  return parseWasmFeature(result);
}

export async function wasmBuildRadarShadedRegion(
  center: LatLngTuple,
  radiusMeters: number,
  gameArea: GameAreaGeometry,
  shadedInside: boolean,
): Promise<PolygonFeature | null> {
  const wasm = await loadKernelWasm();
  const result = wasm.build_radar_shaded_region_json(
    JSON.stringify(center),
    radiusMeters,
    JSON.stringify(gameArea),
    shadedInside,
  );
  return parseWasmFeature(result);
}
