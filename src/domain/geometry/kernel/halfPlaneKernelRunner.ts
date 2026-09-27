import { dispatchKernel } from "./dispatchKernel";
import { createLazyWasmImport } from "./lazyWasmImport";
import type { MaskKernelMode } from "./maskKernelMode";
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
    runWasm: async () => {
      const wasm = await halfPlaneWasm.load();
      return wasm.wasmBuildRadarShadedRegion(
        center,
        radiusMeters,
        gameArea,
        shadedInside,
      );
    },
  });
}

/** Public alias; callers may import either name. */
export const runHalfPlane = dispatchHalfPlane;

/** Public alias; callers may import either name. */
export const runRadarShadedRegion = dispatchRadarShadedRegion;
