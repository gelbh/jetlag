import { lazy, type ComponentType } from "react";
import { attemptChunkReload, isChunkLoadError } from "./chunkLoadRecovery";

export function lazyWithChunkRetry(
  // React.lazy needs a wide component type across named-export modules.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lazy route modules use incompatible prop shapes
  importFn: () => Promise<{ default: ComponentType<any> }>,
) {
  return lazy(() =>
    importFn().catch((error) => {
      if (isChunkLoadError(error) && attemptChunkReload()) {
        return new Promise<never>(() => {});
      }
      throw error;
    }),
  );
}
