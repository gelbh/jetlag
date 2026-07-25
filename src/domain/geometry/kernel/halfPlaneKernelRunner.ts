import { dispatchKernel } from "./dispatchKernel";
import type { MaskKernelMode } from "./maskKernelMode";
import { bboxFromGameArea, maskTopologyMatches } from "./maskTopology";
import {
  buildHalfPlanePolygon,
  buildRadarShadedRegion,
} from "./radarHalfPlane";
import type { GameAreaGeometry, LatLngTuple, PolygonFeature } from "./types";

type HalfPlaneWasmApi = typeof import("./halfPlaneWasm");

let halfPlaneWasmModulePromise: Promise<HalfPlaneWasmApi> | null = null;

function loadHalfPlaneWasmModule(): Promise<HalfPlaneWasmApi> {
  if (!halfPlaneWasmModulePromise) {
    halfPlaneWasmModulePromise = import("./halfPlaneWasm").catch((error) => {
      halfPlaneWasmModulePromise = null;
      throw error;
    });
  }
  return halfPlaneWasmModulePromise;
}

/**
 * Mode + KERNEL_WASM_READY dispatch for half-plane.
 * With halfPlane not ready, always returns TS even when mode is wasm.
 */
export async function dispatchHalfPlane(
  pointA: LatLngTuple,
  pointB: LatLngTuple,
  gameArea: GameAreaGeometry,
  shadedSide: "hot" | "cold" = "cold",
  divisionAnchor: "midpoint" | "start" = "midpoint",
  mode: MaskKernelMode = "ts",
): Promise<PolygonFeature | null> {
  return dispatchKernel({
    mode,
    entrypoint: "halfPlane",
    label: "buildHalfPlanePolygon",
    runTs: () =>
      buildHalfPlanePolygon(
        pointA,
        pointB,
        gameArea,
        shadedSide,
        divisionAnchor,
      ),
    runWasm: async () => {
      const wasm = await loadHalfPlaneWasmModule();
      return wasm.wasmBuildHalfPlanePolygon(
        pointA,
        pointB,
        gameArea,
        shadedSide,
        divisionAnchor,
      );
    },
    matches: (wasmResult, tsResult) =>
      maskTopologyMatches(wasmResult, tsResult, bboxFromGameArea(gameArea)),
  });
}

/**
 * Mode + KERNEL_WASM_READY dispatch for radar shaded region (same entrypoint).
 */
export async function dispatchRadarShadedRegion(
  center: LatLngTuple,
  radiusMeters: number,
  gameArea: GameAreaGeometry,
  shadedInside: boolean,
  mode: MaskKernelMode = "ts",
): Promise<PolygonFeature | null> {
  return dispatchKernel({
    mode,
    entrypoint: "halfPlane",
    label: "buildRadarShadedRegion",
    runTs: () =>
      buildRadarShadedRegion(center, radiusMeters, gameArea, shadedInside),
    runWasm: async () => {
      const wasm = await loadHalfPlaneWasmModule();
      return wasm.wasmBuildRadarShadedRegion(
        center,
        radiusMeters,
        gameArea,
        shadedInside,
      );
    },
    matches: (wasmResult, tsResult) =>
      maskTopologyMatches(wasmResult, tsResult, bboxFromGameArea(gameArea)),
  });
}
