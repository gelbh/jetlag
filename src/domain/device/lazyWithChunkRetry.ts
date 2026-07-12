import { lazy, type ComponentType } from "react";
import { attemptChunkReload, isChunkLoadError } from "./chunkLoadRecovery";

export type ChunkReloadContext = {
  session: unknown;
  pathname: string;
  onNeedRefresh?: () => void;
};

let chunkReloadContextGetter: (() => ChunkReloadContext) | undefined;

export function setChunkReloadContextGetter(
  getter: (() => ChunkReloadContext) | undefined,
): void {
  chunkReloadContextGetter = getter;
}

export function lazyWithChunkRetry(
  // React.lazy needs a wide component type across named-export modules.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lazy route modules use incompatible prop shapes
  importFn: () => Promise<{ default: ComponentType<any> }>,
  getReloadContext?: () => ChunkReloadContext,
) {
  return lazy(() =>
    importFn().catch((error) => {
      if (isChunkLoadError(error)) {
        const context = getReloadContext?.() ?? chunkReloadContextGetter?.();
        if (
          attemptChunkReload(
            context
              ? {
                  session: context.session,
                  pathname: context.pathname,
                  onNeedRefresh: context.onNeedRefresh,
                }
              : undefined,
          )
        ) {
          return new Promise<never>(() => {});
        }
      }
      throw error;
    }),
  );
}
