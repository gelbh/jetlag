import { type KernelEntrypoint, shouldUseWasm } from "./kernelWasmReady";

export type DispatchKernelOptions<T> = {
  entrypoint: KernelEntrypoint;
  label: string;
  runWasm: () => Promise<T>;
};

/**
 * Runs the wasm kernel for a ready entrypoint.
 * Not-ready entrypoints throw (no TS fallback).
 */
export async function dispatchKernel<T>(options: DispatchKernelOptions<T>): Promise<T> {
  const { entrypoint, label, runWasm } = options;
  if (!shouldUseWasm(entrypoint)) {
    throw new Error(`[geometry] kernel entrypoint ${entrypoint} is not wasm-ready`);
  }
  try {
    return await runWasm();
  } catch (error) {
    console.warn(`[geometry] kernel wasm failed (${label})`, error);
    throw error;
  }
}
