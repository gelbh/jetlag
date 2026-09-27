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
  /** Optional until G5i peels TS; required when wasm is not ready. */
  runTs?: () => T;
  runWasm: () => Promise<T>;
};

export type DispatchKernelSyncOptions<T> = {
  mode: MaskKernelMode;
  entrypoint: KernelEntrypoint;
  runTs?: () => T;
};

function runTsOrThrow<T>(
  entrypoint: KernelEntrypoint,
  runTs: (() => T) | undefined,
): T {
  if (!runTs) {
    throw new Error(
      `[geometry] kernel entrypoint ${entrypoint} is not wasm-ready and has no TS fallback`,
    );
  }
  return runTs();
}

/**
 * Sync TS-only path while entrypoint is not ready.
 * When WASM would run, throws — callers must use async {@link dispatchKernel}.
 */
export function dispatchKernelSync<T>(
  options: DispatchKernelSyncOptions<T>,
): T {
  const { mode, entrypoint, runTs } = options;
  if (!shouldUseWasm(mode, entrypoint)) {
    return runTsOrThrow(entrypoint, runTs);
  }
  throw new Error(
    `[geometry] sync kernel path cannot use wasm for ${entrypoint}; use dispatchKernel`,
  );
}

/**
 * Not-ready entrypoints use TS when `runTs` is provided; otherwise throw.
 * wasm rethrows on failure (no silent TS fail-soft).
 */
export async function dispatchKernel<T>(
  options: DispatchKernelOptions<T>,
): Promise<T> {
  const { mode, entrypoint, label, runTs, runWasm } = options;
  const useWasm = shouldUseWasm(mode, entrypoint);

  switch (mode) {
    case "wasm":
      if (!useWasm) {
        return runTsOrThrow(entrypoint, runTs);
      }
      try {
        return await runWasm();
      } catch (error) {
        console.warn(`[geometry] kernel wasm failed (${label})`, error);
        throw error;
      }
    default:
      return assertNever(mode);
  }
}
