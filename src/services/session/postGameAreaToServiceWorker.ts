import {
  createGameAreaSwMessage,
  type GameAreaSwMessage,
} from "@/domain/device/pwa/gameAreaTileMessage";
import type { Bbox } from "@/domain/map/tileBbox";

let latestMessage: GameAreaSwMessage | null = null;
let controllerChangeBound = false;

function resendToNewController(): void {
  if (latestMessage) {
    navigator.serviceWorker.controller?.postMessage(latestMessage);
  }
}

/**
 * Tell the service worker which bbox counts as the game area so viewed tiles
 * there land in the game-area tile cache. `null` clears it (session end).
 * Re-sent on `controllerchange` so a freshly activated SW learns the bbox too.
 */
export function postGameAreaToServiceWorker(bbox: Bbox | null): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  latestMessage = createGameAreaSwMessage(bbox);

  if (!controllerChangeBound) {
    navigator.serviceWorker.addEventListener("controllerchange", resendToNewController);
    controllerChangeBound = true;
  }

  navigator.serviceWorker.controller?.postMessage(latestMessage);
}

/** Test hook — drop module state between cases. */
export function resetGameAreaServiceWorkerPostForTests(): void {
  if (controllerChangeBound && typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.removeEventListener("controllerchange", resendToNewController);
  }
  latestMessage = null;
  controllerChangeBound = false;
}
