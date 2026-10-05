export type KernelEntrypoint =
  | "maskFromUnionInput"
  | "endGameMaskFromDisks"
  | "halfPlane"
  | "geodesicLineBuffer"
  | "spatialVoronoi"
  | "tentacleEliminationRegion"
  | "nearRegionBatch"
  | "unionPolygonFeatures";

/**
 * Per-entrypoint WASM readiness after topology + perf gates.
 * False throws from dispatchKernel (no TS fallback).
 */
export const KERNEL_WASM_READY: Record<KernelEntrypoint, boolean> = {
  maskFromUnionInput: true,
  endGameMaskFromDisks: true,
  halfPlane: true,
  geodesicLineBuffer: true,
  spatialVoronoi: true,
  tentacleEliminationRegion: true,
  nearRegionBatch: true,
  unionPolygonFeatures: false,
};

/** True when the entrypoint registry marks it ready for wasm. */
export function shouldUseWasm(entrypoint: KernelEntrypoint): boolean {
  return KERNEL_WASM_READY[entrypoint];
}
