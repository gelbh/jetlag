import { isChunkLoadError, wasChunkReloadDeferred } from "./chunkLoadRecovery";
import { reloadForChunkLoadError } from "./lazyWithChunkRetry";

type PreloadErrorRecoveryDeps = {
  target?: EventTarget;
  /** Reachability check for the offline gate; inject from the caller (domain stays pure). */
  isOffline?: () => boolean;
  recover?: () => void;
  defer?: (run: () => void) => void;
};

const nextTask = (run: () => void) => {
  window.setTimeout(run, 0);
};

/** Missing chunk or its CSS; module evaluation errors are bugs, not stale builds. */
export function isPreloadLoadFailure(payload: unknown): boolean {
  return (
    isChunkLoadError(payload) ||
    (payload instanceof Error && payload.message.startsWith("Unable to preload CSS"))
  );
}

function recoverUnlessDeferred(isOffline?: () => boolean): void {
  // On the live map (or offline) the reload is already parked; don't re-queue it.
  if (!wasChunkReloadDeferred()) {
    reloadForChunkLoadError(undefined, isOffline);
  }
}

/**
 * Vite fires `vite:preloadError` when a dynamic import (or its CSS) fails,
 * typically after a deploy removed the old hashed files. Reload once to pick
 * up the new build. https://vite.dev/guide/build#load-error-handling
 *
 * No `preventDefault()`: Vite would then resolve the import with `undefined`,
 * which React.lazy renders as an error. The import rejects as usual and
 * `lazyWithChunkRetry` gets first go; recovery runs a task later and is a no-op
 * once a reload is underway. This catches what lazy routes don't: CSS preload
 * failures and plain `import()` calls.
 *
 * Offline handling lives in `attemptChunkReload`, which waits for `online` and
 * retries once however many chunks failed.
 */
export function installPreloadErrorRecovery({
  target = window,
  isOffline,
  recover = () => recoverUnlessDeferred(isOffline),
  defer = nextTask,
}: PreloadErrorRecoveryDeps = {}): void {
  target.addEventListener("vite:preloadError", (event) => {
    if (isPreloadLoadFailure((event as Event & { payload?: unknown }).payload)) {
      defer(recover);
    }
  });
}
