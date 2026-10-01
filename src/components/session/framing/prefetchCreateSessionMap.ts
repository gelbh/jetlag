import mapLibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { mapShellWarmers } from "@/navigation/routePreloaders";

let shellPrefetch: Promise<void> | null = null;
let workerPrefetched = false;

function prefetchMapLibreWorker() {
  if (workerPrefetched || typeof document === "undefined") {
    return;
  }
  workerPrefetched = true;
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = mapLibreWorkerUrl;
  document.head.appendChild(link);
}

/**
 * Warms the MapLibre shell chunk and its worker script without constructing a
 * map, so the facade's first intent only pays for map construction. Safe to
 * call repeatedly; a failed chunk fetch clears the memo so the next intent retries.
 */
export function prefetchCreateSessionMap(): Promise<void> {
  prefetchMapLibreWorker();
  if (!shellPrefetch) {
    shellPrefetch = mapShellWarmers.importMapViewMapLibre().then(
      () => undefined,
      () => {
        shellPrefetch = null;
      },
    );
  }
  return shellPrefetch;
}

/** Test-only: forget memoized prefetch state. */
export function resetCreateSessionMapPrefetchForTests() {
  shellPrefetch = null;
  workerPrefetched = false;
}
