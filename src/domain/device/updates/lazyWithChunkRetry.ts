import { type ComponentType, lazy } from "react";
import { attemptChunkReload, isChunkLoadError } from "./chunkLoadRecovery";

export type ChunkReloadContext = {
  session: unknown;
  pathname: string;
  onNeedRefresh?: () => void;
  registration?: ServiceWorkerRegistration;
  applyUpdate?: (reloadPage?: boolean) => Promise<void>;
};

let chunkReloadContextGetter: (() => ChunkReloadContext) | undefined;
let serviceWorkerChunkReloadContext: Pick<ChunkReloadContext, "registration" | "applyUpdate"> = {};

export function setChunkReloadContextGetter(getter: (() => ChunkReloadContext) | undefined): void {
  chunkReloadContextGetter = getter;
}

export function setServiceWorkerChunkReloadContext(
  context: Pick<ChunkReloadContext, "registration" | "applyUpdate">,
): void {
  serviceWorkerChunkReloadContext = context;
}

export function getServiceWorkerChunkReloadContext(): Pick<
  ChunkReloadContext,
  "registration" | "applyUpdate"
> {
  return serviceWorkerChunkReloadContext;
}

// React.lazy needs a wide component type across named-export modules.
type LazyModule = { default: ComponentType<any> };

/**
 * A thenable that settles inside `.then`. React.lazy resolves on the spot when its factory
 * returns one, so a preloaded module renders without suspending. Hydration needs that: a
 * boundary still waiting on its chunk is client-rendered (prerendered DOM discarded) as soon
 * as an ancestor re-renders.
 */
function resolvedThenable(module: LazyModule): Promise<LazyModule> {
  return {
    // biome-ignore lint/suspicious/noThenProperty: React.lazy must see a sync thenable here.
    then(onFulfilled: (value: LazyModule) => unknown) {
      onFulfilled(module);
    },
  } as unknown as Promise<LazyModule>;
}

export function lazyWithChunkRetry(
  importFn: () => Promise<LazyModule>,
  getReloadContext?: () => ChunkReloadContext,
) {
  let loaded: LazyModule | undefined;
  let pending: Promise<LazyModule> | undefined;
  // Shared in-flight load: a preload racing the first render must not import twice.
  const load = () =>
    (pending ??= importFn().then(
      (module) => {
        loaded = module;
        return module;
      },
      (error: unknown) => {
        pending = undefined;
        throw error;
      },
    ));

  const component = lazy(() =>
    loaded
      ? resolvedThenable(loaded)
      : load().catch((error) => {
          if (isChunkLoadError(error)) {
            const resolveContext = () => getReloadContext?.() ?? chunkReloadContextGetter?.();
            if (attemptChunkReload({ ...resolveContext(), resolveRetryOptions: resolveContext })) {
              return new Promise<never>(() => {});
            }
          }
          throw error;
        }),
  );

  /** Load the module so the first render of `component` does not suspend. */
  const preload = async (): Promise<void> => {
    if (!loaded) {
      await load();
    }
  };

  return Object.assign(component, { preload });
}

export type LazyRouteComponent = ReturnType<typeof lazyWithChunkRetry>;
