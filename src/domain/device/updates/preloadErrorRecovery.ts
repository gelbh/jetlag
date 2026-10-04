import { reloadForChunkLoadError } from "./lazyWithChunkRetry";

type PreloadErrorRecoveryDeps = {
  target?: Pick<Window, "addEventListener">;
  isOnline?: () => boolean;
  recover?: () => boolean;
  defer?: (run: () => void) => void;
};

const browserOnline = () => typeof navigator === "undefined" || navigator.onLine !== false;
const nextTask = (run: () => void) => {
  window.setTimeout(run, 0);
};

/**
 * Vite fires `vite:preloadError` when a dynamic import (or its CSS) fails to
 * load, typically after a deploy removed the old hashed files. Reload once to
 * pick up the new build. https://vite.dev/guide/build#load-error-handling
 *
 * No `preventDefault()`: Vite would then resolve the import with `undefined`,
 * which React.lazy renders as an error. The import rejects as usual and
 * `lazyWithChunkRetry` gets first go; recovery runs a task later and is a no-op
 * once a reload is underway. This catches what lazy routes don't: CSS preload
 * failures and plain `import()` calls.
 *
 * Offline, a reload would only land on the browser's error page, so wait for
 * `online` and recover then, once however many chunks failed.
 */
export function installPreloadErrorRecovery({
  target = window,
  isOnline = browserOnline,
  recover = () => reloadForChunkLoadError(),
  defer = nextTask,
}: PreloadErrorRecoveryDeps = {}): void {
  let waitingForOnline = false;

  target.addEventListener("vite:preloadError", () => {
    if (isOnline()) {
      defer(() => {
        recover();
      });
      return;
    }
    if (waitingForOnline) {
      return;
    }
    waitingForOnline = true;
    target.addEventListener(
      "online",
      () => {
        waitingForOnline = false;
        recover();
      },
      { once: true },
    );
  });
}
