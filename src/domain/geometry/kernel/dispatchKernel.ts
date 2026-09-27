import type { MaskKernelMode } from "./maskKernelMode";
import {
  type KernelEntrypoint,
  shouldUseWasm,
} from "./kernelWasmReady";

function assertNever(value: never): never {
  throw new Error(`Unexpected mask kernel mode: ${String(value)}`);
}

export type DispatchKernelOptions<T> = {
  mode: MaskKernelMode;
  entrypoint: KernelEntrypoint;
  label: string;
  runTs: () => T;
  runWasm: () => Promise<T>;
  /** Dual-mode topology compare; omit to skip mismatch logging. */
  matches?: (wasm: T, ts: T) => boolean;
};

export type DispatchKernelSyncOptions<T> = {
  mode: MaskKernelMode;
  entrypoint: KernelEntrypoint;
  runTs: () => T;
};

/**
 * Sync TS-only path while entrypoint is not ready.
 * When WASM would run, throws — callers must use async {@link dispatchKernel}.
 */
export function dispatchKernelSync<T>(
  options: DispatchKernelSyncOptions<T>,
): T {
  const { mode, entrypoint, runTs } = options;
  if (!shouldUseWasm(mode, entrypoint)) {
    return runTs();
  }
  throw new Error(
    `[geometry] sync kernel path cannot use wasm for ${entrypoint}; use dispatchKernel`,
  );
}

/**
 * Not-ready entrypoints always use TS (even for wasm/dual).
 * wasm rethrows on failure (no silent TS fail-soft); dual compares then returns TS.
 */
export async function dispatchKernel<T>(
  options: DispatchKernelOptions<T>,
): Promise<T> {
  const { mode, entrypoint, label, runTs, runWasm, matches } = options;
  const useWasm = shouldUseWasm(mode, entrypoint);

  switch (mode) {
    case "wasm":
      if (!useWasm) {
        return runTs();
      }
      try {
        return await runWasm();
      } catch (error) {
        console.warn(`[geometry] kernel wasm failed (${label})`, error);
        throw error;
      }
    case "dual": {
      const tsResult = runTs();
      if (useWasm) {
        try {
          const wasmResult = await runWasm();
          if (matches && !matches(wasmResult, tsResult)) {
            console.warn(`[geometry] kernel dual mismatch (${label})`);
          }
        } catch (error) {
          console.warn(
            `[geometry] kernel dual wasm failed (${label})`,
            error,
          );
        }
      }
      return tsResult;
    }
    default:
      return assertNever(mode);
  }
}
