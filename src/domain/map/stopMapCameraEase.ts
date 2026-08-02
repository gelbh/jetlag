import type { Map as MapLibreMap } from "maplibre-gl";

type MapLibreCamera = {
  /** When `allowGestures` is true, skip HandlerManager.reset (keep active pan). */
  stop?: (allowGestures?: boolean) => void;
  isEasing?: () => boolean;
};

type MapWithCamera = MapLibreMap & {
  _camera?: MapLibreCamera;
  isEasing?: () => boolean;
};

/**
 * Cancel programmatic ease/fly without resetting active gesture handlers.
 *
 * `map.stop()` ends the camera animation **and** calls HandlerManager.stop(),
 * which `reset()`s DragPan/TouchPan. Listening for that on `dragstart` aborts
 * the gesture that just began — the map nudges then stops following the finger.
 */
export function stopMapCameraEase(map: MapLibreMap): void {
  const camera = (map as MapWithCamera)._camera;
  if (typeof camera?.stop === "function") {
    camera.stop(true);
    return;
  }

  const easing =
    typeof (map as MapWithCamera).isEasing === "function"
      ? (map as MapWithCamera).isEasing!()
      : true;
  if (easing) {
    map.stop();
  }
}
