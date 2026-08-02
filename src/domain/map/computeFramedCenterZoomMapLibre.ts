import type {
  LngLatBoundsLike,
  LngLatLike,
  Map as MapLibreMap,
  PaddingOptions,
} from "maplibre-gl";

function normalizeLngLat(center: LngLatLike): { lng: number; lat: number } {
  if (Array.isArray(center)) {
    return { lng: center[0], lat: center[1] };
  }
  if (
    typeof center === "object" &&
    center !== null &&
    "lng" in center &&
    "lat" in center
  ) {
    return { lng: center.lng, lat: center.lat };
  }
  throw new Error("computeFramedCenterZoomMapLibre: unsupported center");
}

/**
 * MapLibre equivalent of {@link computeFramedCenterZoom}: uses `cameraForBounds`
 * so asymmetric padding shifts the center the same way fitBounds would.
 */
export function computeFramedCenterZoomMapLibre(
  map: MapLibreMap,
  bounds: LngLatBoundsLike,
  padding: PaddingOptions,
  minZoom?: number,
  maxZoom?: number,
): { center: { lng: number; lat: number }; zoom: number } | null {
  const camera = map.cameraForBounds(bounds, {
    padding,
    ...(typeof maxZoom === "number" ? { maxZoom } : {}),
  });
  if (camera?.center == null || camera.zoom == null) {
    return null;
  }

  let zoom = camera.zoom;
  if (typeof maxZoom === "number") {
    zoom = Math.min(maxZoom, zoom);
  }
  if (typeof minZoom === "number") {
    zoom = Math.max(minZoom, zoom);
  }

  return { center: normalizeLngLat(camera.center), zoom };
}
