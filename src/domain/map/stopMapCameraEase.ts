import type { Map as MapLibreMap } from "maplibre-gl";

type MapLibreCamera = {
  stop?: (allowGestures?: boolean) => void;
  isEasing?: () => boolean;
};

type MapWithCamera = MapLibreMap & {
  _camera?: MapLibreCamera;
  isEasing?: () => boolean;
};

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
