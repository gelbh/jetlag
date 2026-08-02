import { useCallback, useEffect, useMemo, useRef } from "react";
import Map, { type MapLayerMouseEvent, type MapRef } from "react-map-gl/maplibre";
import { setWorkerUrl, type Map as MapLibreMap } from "maplibre-gl";
import { LatLngBounds, type LatLngExpression } from "leaflet";
import "maplibre-gl/dist/maplibre-gl.css";
import mapLibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import {
  getBasemapSurface,
  getMapLibreStyle,
} from "../../../domain/map/mapBasemaps";
import { isUsableMapBounds } from "../../../domain/geometry/gameArea/geometry";
import type { MapViewCoreProps } from "./mapViewTypes";

setWorkerUrl(mapLibreWorkerUrl);

const FALLBACK_LNGLAT: [number, number] = [-0.09, 51.505];

function centerToLngLat(center: LatLngExpression | undefined): [number, number] {
  if (center == null) {
    return FALLBACK_LNGLAT;
  }
  if (Array.isArray(center)) {
    const [lat, lng] = center;
    return [lng, lat];
  }
  if (
    typeof center === "object" &&
    "lat" in center &&
    "lng" in center &&
    typeof center.lat === "number" &&
    typeof center.lng === "number"
  ) {
    return [center.lng, center.lat];
  }
  if (import.meta.env.DEV) {
    throw new Error(
      `MapViewMapLibre: unsupported LatLngExpression ${String(center)}`,
    );
  }
  return FALLBACK_LNGLAT;
}

function leafletBoundsFromMapLibre(map: MapLibreMap): LatLngBounds {
  const b = map.getBounds();
  return new LatLngBounds(
    [b.getSouth(), b.getWest()],
    [b.getNorth(), b.getEast()],
  );
}

/**
 * MapLibre shell (Slice 1): basemap + click/bounds bridge.
 * Accepts {@link MapViewCoreProps} only — Leaflet chrome is out of contract.
 */
export function MapViewMapLibre({
  center = [51.505, -0.09],
  zoom = 13,
  className,
  mapStyle = "standard",
  streetBasemap = "light",
  onBoundsChange,
  onUserViewportFramed,
  onMapClick,
  interactive = true,
  children,
  mapKey,
}: MapViewCoreProps) {
  const mapRef = useRef<MapRef>(null);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onUserViewportFramedRef = useRef(onUserViewportFramed);
  const style = useMemo(
    () => getMapLibreStyle(mapStyle, streetBasemap),
    [mapStyle, streetBasemap],
  );
  const surface = getBasemapSurface(mapStyle, streetBasemap);
  const containerSurfaceClass =
    surface === "light" ? "jl-basemap--light" : "jl-basemap--dark-canvas";
  const satelliteGradeClass =
    mapStyle === "satellite" ? " jl-basemap--satellite-grade" : "";
  const [longitude, latitude] = centerToLngLat(center);

  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
    onUserViewportFramedRef.current = onUserViewportFramed;
  }, [onBoundsChange, onUserViewportFramed]);

  const emitBounds = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) {
      return;
    }
    const nextBounds = leafletBoundsFromMapLibre(map);
    if (!isUsableMapBounds(nextBounds)) {
      return;
    }
    onBoundsChangeRef.current?.(nextBounds);
  }, []);

  const handleMoveEnd = useCallback(() => {
    emitBounds();
  }, [emitBounds]);

  const handleDragEnd = useCallback(() => {
    onUserViewportFramedRef.current?.();
  }, []);

  const handleZoomEnd = useCallback(
    (event: { originalEvent?: Event }) => {
      emitBounds();
      if (event.originalEvent) {
        onUserViewportFramedRef.current?.();
      }
    },
    [emitBounds],
  );

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      onMapClick?.(event.lngLat.lat, event.lngLat.lng);
    },
    [onMapClick],
  );

  return (
    <div className={className ?? "h-full w-full"}>
      <div
        className={
          interactive
            ? `h-full w-full ${containerSurfaceClass}${satelliteGradeClass}`
            : `h-full w-full pointer-events-auto ${containerSurfaceClass}${satelliteGradeClass}`
        }
      >
        <Map
          key={mapKey}
          ref={mapRef}
          initialViewState={{
            longitude,
            latitude,
            zoom,
            pitch: 0,
            bearing: 0,
          }}
          style={{ width: "100%", height: "100%" }}
          mapStyle={style}
          attributionControl={false}
          dragPan={interactive}
          boxZoom={interactive}
          keyboard={interactive}
          scrollZoom={interactive}
          doubleClickZoom={interactive}
          dragRotate={false}
          touchPitch={false}
          touchZoomRotate={interactive}
          pitchWithRotate={false}
          onLoad={() => {
            const map = mapRef.current?.getMap();
            map?.touchZoomRotate.disableRotation();
            emitBounds();
          }}
          onMoveEnd={handleMoveEnd}
          onDragEnd={handleDragEnd}
          onZoomEnd={handleZoomEnd}
          onClick={handleClick}
        >
          {children}
        </Map>
      </div>
    </div>
  );
}
