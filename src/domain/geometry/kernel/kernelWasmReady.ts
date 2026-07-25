import type { MaskKernelMode } from "./maskKernelMode";

export type KernelEntrypoint =
  | "maskFromUnionInput"
  | "endGameMaskFromDisks"
  | "halfPlane"
  | "geodesicLineBuffer";

/**
 * Per-entrypoint WASM readiness. Wave-1 entrypoints are enabled after
 * topology + perf gates; keep TS fallback via dispatchKernel.
 */
export const KERNEL_WASM_READY: Record<KernelEntrypoint, boolean> = {
  maskFromUnionInput: true,
  endGameMaskFromDisks: true,
  halfPlane: true,
  geodesicLineBuffer: false,
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
