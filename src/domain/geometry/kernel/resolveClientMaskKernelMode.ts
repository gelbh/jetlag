import { getClientEnv } from "../../../config/env";
import {
  resolveMaskKernelMode,
  type MaskKernelMode,
} from "./maskKernelMode";

const MASK_KERNEL_STORAGE_KEY = "jl.geometry.maskKernel";

function readMaskKernelLocalStorage(): string | null {
  try {
    return localStorage.getItem(MASK_KERNEL_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Browser mode: localStorage overrides env; unset → wasm. */
export function resolveClientMaskKernelMode(): MaskKernelMode {
  return resolveMaskKernelMode({
    envValue: getClientEnv().VITE_GEOMETRY_MASK_KERNEL,
    localStorageValue: readMaskKernelLocalStorage(),
  });
}
