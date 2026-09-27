import type { MaskKernelMode } from "./maskKernelMode";

export type KernelEntrypoint =
  | "maskFromUnionInput"
  | "endGameMaskFromDisks"
  | "halfPlane"
  | "geodesicLineBuffer"
  | "spatialVoronoi"
  | "tentacleEliminationRegion"
  | "nearRegionBatch";

/**
 * Per-entrypoint WASM readiness after topology + perf gates.
 * False keeps TS via dispatchKernel (not-ready path).
 */
export const KERNEL_WASM_READY: Record<KernelEntrypoint, boolean> = {
  maskFromUnionInput: true,
  endGameMaskFromDisks: true,
  halfPlane: true,
  geodesicLineBuffer: true,
  spatialVoronoi: true,
  tentacleEliminationRegion: true,
  nearRegionBatch: true,
};

/** True when mode asks for WASM and the entrypoint registry marks it ready. */
export function shouldUseWasm(
  mode: MaskKernelMode,
  entrypoint: KernelEntrypoint,
): boolean {
  if (!KERNEL_WASM_READY[entrypoint]) {
    return false;
  }
  return mode === "wasm" || mode === "dual";
}
