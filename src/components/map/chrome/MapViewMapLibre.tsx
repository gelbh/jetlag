import { useCallback, useEffect, useMemo, useRef } from "react";
import Map, { type MapLayerMouseEvent, type MapRef } from "react-map-gl/maplibre";
import type { Map as MapLibreMap } from "maplibre-gl";
import { LatLngBounds } from "leaflet";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  getBasemapSurface,
  getMapLibreStyle,
} from "../../../domain/map/mapBasemaps";
import { isUsableMapBounds } from "../../../domain/geometry/gameArea/geometry";
import type { MapViewProps } from "./mapViewTypes";

function centerToLngLat(
  center: MapViewProps["center"],
): [number, number] {
  if (center == null) {
    return [-0.09, 51.505];
  }
  if (Array.isArray(center)) {
    const [a, b] = center;
    // Leaflet LatLngExpression tuples are [lat, lng]
    return [b, a];
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
  return [-0.09, 51.505];
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
 * Leaflet chrome controls / focus camera land in later slices.
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
}: MapViewProps) {
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
    <div
      className={
        className ??
        (interactive
          ? `h-full w-full ${containerSurfaceClass}${satelliteGradeClass}`
          : `h-full w-full pointer-events-auto ${containerSurfaceClass}${satelliteGradeClass}`)
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
        scrollZoom={interactive}
        doubleClickZoom={interactive}
        touchZoomRotate={interactive}
        pitchWithRotate={false}
        onLoad={emitBounds}
        onMoveEnd={handleMoveEnd}
        onDragEnd={handleDragEnd}
        onZoomEnd={handleZoomEnd}
        onClick={handleClick}
      >
        {children}
      </Map>
    </div>
  );
}
