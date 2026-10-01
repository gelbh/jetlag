import { useSyncExternalStore } from "react";
import { isPrerenderCapture } from "@/domain/device/perf/prerenderCapture";

const subscribe = () => () => {};
// Stays false while the prerender script snapshots the page, so the snapshot equals the
// hydration-time render.
const getClientSnapshot = () => !isPrerenderCapture();
const getServerSnapshot = () => false;

/**
 * `false` only while React hydrates a prerendered shell (`hydrateRoot` uses the server snapshot),
 * then `true` after a synchronous re-render. Under `createRoot` it is `true` from the first
 * render, so non-prerendered routes pay nothing.
 *
 * Gate first-render branches on device / storage / consent / clock state with it. It is also
 * `false` for the whole prerender capture (`isPrerenderCapture`), so those branches never reach
 * the snapshot that hydration has to match.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
}
