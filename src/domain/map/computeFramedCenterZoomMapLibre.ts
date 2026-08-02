import {
  LngLatBounds,
  MercatorCoordinate,
  type LngLatBoundsLike,
  type LngLatLike,
  type Map as MapLibreMap,
  type PaddingOptions,
} from "maplibre-gl";

/** Web Mercator tile size used by MapLibre / Leaflet CRS.EPSG3857. */
const WORLD_TILE_SIZE = 512;

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
  if (
    typeof center === "object" &&
    center !== null &&
    "lon" in center &&
    "lat" in center
  ) {
    return { lng: center.lon, lat: center.lat };
  }
  throw new Error("computeFramedCenterZoomMapLibre: unsupported center");
}

function worldScaleAtZoom(zoom: number): number {
  return WORLD_TILE_SIZE * 2 ** zoom;
}

/** Project lng/lat into world pixels at `zoom` (Leaflet `map.project(_, zoom)`). */
export function projectLngLatAtZoom(
  lngLat: { lng: number; lat: number },
  zoom: number,
): { x: number; y: number } {
  const mc = MercatorCoordinate.fromLngLat(lngLat);
  const scale = worldScaleAtZoom(zoom);
  return { x: mc.x * scale, y: mc.y * scale };
}

/** Unproject world pixels at `zoom` (Leaflet `map.unproject(_, zoom)`). */
export function unprojectPointAtZoom(
  point: { x: number; y: number },
  zoom: number,
): { lng: number; lat: number } {
  const scale = worldScaleAtZoom(zoom);
  const lngLat = new MercatorCoordinate(point.x / scale, point.y / scale).toLngLat();
  return { lng: lngLat.lng, lat: lngLat.lat };
}

/**
 * Midpoint of SW/NE at `zoom`, shifted by asymmetric padding — same math as
 * Leaflet {@link computeFramedCenterZoom} after a min/max zoom clamp.
 */
export function computePaddedCenterAtZoom(
  sw: { lng: number; lat: number },
  ne: { lng: number; lat: number },
  padding: PaddingOptions,
  zoom: number,
): { lng: number; lat: number } {
  const top = padding.top ?? 0;
  const right = padding.right ?? 0;
  const bottom = padding.bottom ?? 0;
  const left = padding.left ?? 0;
  const paddingOffsetX = (right - left) / 2;
  const paddingOffsetY = (bottom - top) / 2;
  const swPoint = projectLngLatAtZoom(sw, zoom);
  const nePoint = projectLngLatAtZoom(ne, zoom);
  return unprojectPointAtZoom(
    {
      x: (swPoint.x + nePoint.x) / 2 + paddingOffsetX,
      y: (swPoint.y + nePoint.y) / 2 + paddingOffsetY,
    },
    zoom,
  );
}

/**
 * MapLibre equivalent of {@link computeFramedCenterZoom}: uses `cameraForBounds`
 * so asymmetric padding shifts the center the same way fitBounds would. When
 * min/max zoom clamps change the camera zoom, recompute the center at the final
 * zoom (MapLibre `project`/`unproject` are transform-bound and cannot take zoom).
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

  if (zoom === camera.zoom) {
    return { center: normalizeLngLat(camera.center), zoom };
  }

  const llb = LngLatBounds.convert(bounds);
  const center = computePaddedCenterAtZoom(
    llb.getSouthWest(),
    llb.getNorthEast(),
    padding,
    zoom,
  );
  return { center, zoom };
}
