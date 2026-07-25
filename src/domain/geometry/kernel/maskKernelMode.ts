export type MaskKernelMode = "ts" | "dual" | "wasm";

const MASK_KERNEL_MODES = new Set<MaskKernelMode>(["ts", "dual", "wasm"]);

function parseMaskKernelMode(value: string | undefined | null): MaskKernelMode | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  if (MASK_KERNEL_MODES.has(trimmed as MaskKernelMode)) {
    return trimmed as MaskKernelMode;
  }
  return null;
}

/** Resolve mask kernel mode: localStorage overrides env; invalid/missing → "ts". */
export function resolveMaskKernelMode(options?: {
  envValue?: string | undefined;
  localStorageValue?: string | null;
}): MaskKernelMode {
  const fromLocalStorage = parseMaskKernelMode(options?.localStorageValue);
  if (fromLocalStorage) {
    return fromLocalStorage;
  }
  const fromEnv = parseMaskKernelMode(options?.envValue);
  if (fromEnv) {
    return fromEnv;
  }
  return "ts";
}
