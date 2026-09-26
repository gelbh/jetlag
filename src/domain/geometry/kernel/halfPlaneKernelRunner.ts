import { dispatchKernel } from "./dispatchKernel";
import { createLazyWasmImport } from "./lazyWasmImport";
import type { MaskKernelMode } from "./maskKernelMode";
import { bboxFromGameArea, maskTopologyMatches } from "./maskTopology";
import {
  buildHalfPlanePolygon,
  buildRadarShadedRegion,
} from "./radarHalfPlane";
import type { GameAreaGeometry, LatLngTuple, PolygonFeature } from "./types";

const halfPlaneWasm = createLazyWasmImport(() => import("./halfPlaneWasm"));

export async function dispatchHalfPlane(
  pointA: LatLngTuple,
  pointB: LatLngTuple,
  gameArea: GameAreaGeometry,
  shadedSide: "hot" | "cold" = "cold",
  divisionAnchor: "midpoint" | "start" = "midpoint",
  mode: MaskKernelMode = "wasm",
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
      const wasm = await halfPlaneWasm.load();
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

export async function dispatchRadarShadedRegion(
  center: LatLngTuple,
  radiusMeters: number,
  gameArea: GameAreaGeometry,
  shadedInside: boolean,
  mode: MaskKernelMode = "wasm",
): Promise<PolygonFeature | null> {
  return dispatchKernel({
    mode,
    entrypoint: "halfPlane",
    label: "buildRadarShadedRegion",
    runTs: () =>
      buildRadarShadedRegion(center, radiusMeters, gameArea, shadedInside),
    runWasm: async () => {
      const wasm = await halfPlaneWasm.load();
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

/** Public alias; callers may import either name. */
export const runHalfPlane = dispatchHalfPlane;

/** Public alias; callers may import either name. */
export const runRadarShadedRegion = dispatchRadarShadedRegion;
