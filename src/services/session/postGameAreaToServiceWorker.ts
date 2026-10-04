import {
  createGameAreaSwMessage,
  type GameAreaSwMessage,
} from "@/domain/device/pwa/gameAreaTileMessage";
import type { BoundingBox } from "@/domain/geometry/gameArea/gameAreaBounds";

let latestMessage: GameAreaSwMessage | null = null;
let holders = 0;
let controllerChangeBound = false;

function sameBbox(a: BoundingBox | null, b: BoundingBox | null): boolean {
  return (
    a === b ||
    (a !== null &&
      b !== null &&
      a.south === b.south &&
      a.west === b.west &&
      a.north === b.north &&
      a.east === b.east)
  );
}

function resendToNewController(): void {
  if (latestMessage) {
    navigator.serviceWorker.controller?.postMessage(latestMessage);
  }
}

function hasServiceWorker(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

/**
 * Tell the service worker which bbox counts as the game area so viewed tiles
 * there land in the game-area tile cache. `null` clears it (session end).
 * Skips repeats; re-sent on `controllerchange` so a freshly activated SW learns it too.
 */
export function postGameAreaToServiceWorker(bbox: BoundingBox | null): void {
  if (!hasServiceWorker()) {
    return;
  }
  if (latestMessage && sameBbox(latestMessage.bbox, bbox)) {
    return;
  }

  latestMessage = createGameAreaSwMessage(bbox);

  if (!controllerChangeBound) {
    navigator.serviceWorker.addEventListener("controllerchange", resendToNewController);
    controllerChangeBound = true;
  }

  navigator.serviceWorker.controller?.postMessage(latestMessage);
}

/**
 * Hold the game-area bbox while a map screen is mounted. The returned release
 * clears it only when the last holder lets go, so nested screens (admin monitor
 * pane + embedded admin map) cannot clear a bbox the outer screen still uses.
 * With several holders, the most recent retain's bbox wins.
 */
export function retainGameAreaForServiceWorker(bbox: BoundingBox | null): () => void {
  holders += 1;
  postGameAreaToServiceWorker(bbox);
  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    holders -= 1;
    // Deferred: an effect re-run (release → retain in one commit) must not flash null.
    queueMicrotask(() => {
      if (holders === 0) {
        postGameAreaToServiceWorker(null);
      }
    });
  };
}

/** Test hook — drop module state between cases. */
export function resetGameAreaServiceWorkerPostForTests(): void {
  if (controllerChangeBound && hasServiceWorker()) {
    navigator.serviceWorker.removeEventListener("controllerchange", resendToNewController);
  }
  latestMessage = null;
  holders = 0;
  controllerChangeBound = false;
}
