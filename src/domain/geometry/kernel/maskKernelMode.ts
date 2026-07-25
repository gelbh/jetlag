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

/** True when a non-empty string was provided but is not a known mode. */
function isInvalidMaskKernelMode(value: string | undefined | null): boolean {
  if (value == null) {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return false;
  }
  return parseMaskKernelMode(trimmed) === null;
}

/** Resolve mask kernel mode: localStorage overrides env; missing → "wasm"; invalid → "ts". */
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
  if (
    isInvalidMaskKernelMode(options?.localStorageValue) ||
    isInvalidMaskKernelMode(options?.envValue)
  ) {
    return "ts";
  }
  return "wasm";
}
