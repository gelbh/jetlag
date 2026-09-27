/**
 * Shared lazy dynamic-import cache for kernel WASM bridges.
 * Clears the cached promise on load failure so a later call can retry.
 */
export function createLazyWasmImport<T>(loader: () => Promise<T>): {
  load: () => Promise<T>;
  resetForTests: () => void;
} {
  let modulePromise: Promise<T> | null = null;

  return {
    load() {
      if (!modulePromise) {
        // Lazy chunk: ts mode never executes this; Vite still emits an async
        // chunk, with optionalKernelWasmPkg stubbing when gitignored pkg/ is
        // missing.
        modulePromise = loader().catch((error) => {
          modulePromise = null;
          throw error;
        });
      }
      return modulePromise;
    },
    resetForTests() {
      modulePromise = null;
    },
  };
}
