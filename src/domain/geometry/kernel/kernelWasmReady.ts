import type { MaskKernelMode } from "./maskKernelMode";

export type KernelEntrypoint =
  | "maskFromUnionInput"
  | "endGameMaskFromDisks"
  | "halfPlane"
  | "geodesicLineBuffer";

/**
 * Per-entrypoint WASM readiness. Mask is ready post-cutover; extras stay on TS
 * until their own topology + perf gates pass (separate flip PR).
 */
export const KERNEL_WASM_READY: Record<KernelEntrypoint, boolean> = {
  maskFromUnionInput: true,
  endGameMaskFromDisks: true,
  halfPlane: false,
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
