import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import Map, {
  AttributionControl,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import { setWorkerUrl, type Map as MapLibreMap } from "maplibre-gl";
import {
  createMapBounds,
  toMapBounds,
  type MapBoundsExpression,
  type MapLatLng,
} from "../../../domain/map/mapBounds";
import "maplibre-gl/dist/maplibre-gl.css";
import "../../../styles/map-touch-gestures.css";
import mapLibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import {
  getBasemapSurface,
  getMapLibreStyle,
} from "../../../domain/map/mapBasemaps";
import { isUsableMapBounds } from "../../../domain/geometry/gameArea/geometry";
import { computeFramedCenterZoomMapLibre } from "../../../domain/map/computeFramedCenterZoomMapLibre";
import { focusBoundsToLngLatBounds } from "../../../domain/map/focusBoundsToLngLatBounds";
import { isLargeCameraJumpMapLibre } from "../../../domain/map/isLargeCameraJumpMapLibre";
import { shouldApplyMapFocus } from "../../../domain/map/mapFocusPolicy";
import { resolveMapPitchDegrees } from "../../../domain/map/resolveMapPitchDegrees";
import { stopMapCameraEase } from "../../../domain/map/stopMapCameraEase";
import {
  MOTION_MAP_CAMERA_FLY_MS,
  MOTION_MAP_CAMERA_MS,
} from "../../../domain/device/motion/motionTokens";
import { useMotionProfile } from "../../../hooks/motion/useMotionProfile";
import { useMapStore } from "../../../state/mapStore";
import { useMapLibreMap } from "../helpers/useMapLibreMap";
import { MapChromeListener } from "./MapChromeListener";
import { MapRecenterControl } from "./MapRecenterControl";
import { MapStyleToggle } from "./MapStyleToggle";
import { MapZoomControl } from "./MapZoomControl";
import type { MapViewMapLibreProps } from "./mapViewTypes";

setWorkerUrl(mapLibreWorkerUrl);

const FALLBACK_LNGLAT: [number, number] = [-0.09, 51.505];

function centerToLngLat(center: MapLatLng | undefined): [number, number] {
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

function mapBoundsFromMapLibre(map: MapLibreMap) {
  const b = map.getBounds();
  return createMapBounds({
    south: b.getSouth(),
    west: b.getWest(),
    north: b.getNorth(),
    east: b.getEast(),
  });
}

function MapFocus({
  focusBounds,
  focusMinZoom,
  focusMaxZoom,
  fitBoundsMode,
  recenterToken = 0,
  suppressChromeHideRef,
  fitBoundsPadding: fitBoundsPaddingProp,
  focusPaddingBias,
  preferFly = false,
}: {
  focusBounds: MapBoundsExpression | null;
  focusMinZoom?: number;
  focusMaxZoom?: number;
  fitBoundsMode: "once" | "always";
  recenterToken: number;
  suppressChromeHideRef?: RefObject<boolean>;
  fitBoundsPadding?: [number, number];
  focusPaddingBias?: number;
  preferFly?: boolean;
}) {
  const mapRef = useMapLibreMap();
  const { prefersReducedMotion, lowPowerMode } = useMotionProfile();
  const hasFittedRef = useRef(false);
  const lastRecenterRef = useRef(recenterToken);
  const animate = !prefersReducedMotion && !lowPowerMode;
  const padY = fitBoundsPaddingProp?.[0] ?? 32;
  const padX = fitBoundsPaddingProp?.[1] ?? 32;

  useEffect(() => {
    const map = mapRef.getMap();
    const handleDragStart = () => {
      // Interrupt flyTo/easeTo only — never map.stop() (resets TouchPan/TouchZoom).
      stopMapCameraEase(map);
      if (suppressChromeHideRef) {
        suppressChromeHideRef.current = false;
      }
    };

    map.on("dragstart", handleDragStart);
    return () => {
      map.off("dragstart", handleDragStart);
    };
  }, [mapRef, suppressChromeHideRef]);

  useEffect(() => {
    if (!focusBounds) {
      return;
    }

    if (
      !shouldApplyMapFocus({
        fitBoundsMode,
        hasFitted: hasFittedRef.current,
        recenterToken,
        lastRecenterToken: lastRecenterRef.current,
      })
    ) {
      return;
    }

    const map = mapRef.getMap();
    map.resize();

    const padding = {
      top: padY,
      left: padX,
      right: padX,
      bottom: padY + (focusPaddingBias ?? 0),
    };

    const mapBounds = toMapBounds(focusBounds);
    if (!isUsableMapBounds(mapBounds)) {
      return;
    }

    const lngLatBounds = focusBoundsToLngLatBounds(mapBounds);
    const framed = computeFramedCenterZoomMapLibre(
      map,
      lngLatBounds,
      padding,
      focusMinZoom,
      focusMaxZoom,
    );
    if (!framed) {
      return;
    }

    lastRecenterRef.current = recenterToken;
    hasFittedRef.current = true;

    if (suppressChromeHideRef) {
      suppressChromeHideRef.current = true;
    }

    const onMoveEnd = () => {
      if (suppressChromeHideRef) {
        suppressChromeHideRef.current = false;
      }
      map.off("moveend", onMoveEnd);
    };

    map.on("moveend", onMoveEnd);

    const { center, zoom } = framed;

    if (!animate) {
      map.jumpTo({ center, zoom });
      return () => {
        // Same as dragstart: cancel ease only — map.stop() resets active pinch/pan.
        stopMapCameraEase(map);
        map.off("moveend", onMoveEnd);
        if (suppressChromeHideRef) {
          suppressChromeHideRef.current = false;
        }
      };
    }

    if (isLargeCameraJumpMapLibre(map, center, zoom, preferFly)) {
      map.flyTo({
        center,
        zoom,
        duration: MOTION_MAP_CAMERA_FLY_MS,
      });
    } else {
      map.easeTo({
        center,
        zoom,
        duration: MOTION_MAP_CAMERA_MS,
      });
    }

    return () => {
      stopMapCameraEase(map);
      map.off("moveend", onMoveEnd);
      if (suppressChromeHideRef) {
        suppressChromeHideRef.current = false;
      }
    };
  }, [
    animate,
    focusBounds,
    focusMaxZoom,
    focusMinZoom,
    fitBoundsMode,
    padX,
    padY,
    focusPaddingBias,
    mapRef,
    preferFly,
    recenterToken,
    suppressChromeHideRef,
  ]);

  return null;
}

/**
 * MapLibre shell: basemap + chrome + click/bounds + camera/focus parity.
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
  chromeHudRef,
  suppressChromeHideRef,
  focusBounds = null,
  focusMinZoom,
  focusMaxZoom,
  fitBoundsMode = "always",
  fitBoundsPadding,
  focusPaddingBias,
  focusPreferFly,
  recenterToken = 0,
  showZoomControl,
  zoomControlInset = "dock",
  onMapStyleChange,
  showMapStyleToggle,
  mapStyleControlInset,
  showRecenterControl,
  onRecenter,
}: MapViewMapLibreProps) {
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
  const zoomControlEnabled = showZoomControl ?? interactive;
  const mapStyleToggleEnabled =
    (showMapStyleToggle ?? Boolean(onMapStyleChange)) &&
    Boolean(onMapStyleChange);
  const styleControlInset = mapStyleControlInset ?? zoomControlInset;
  const mapPitchEnabled = useMapStore((state) => state.mapPitchEnabled);
  const { lowPowerMode } = useMotionProfile();
  const maxPitchDegrees = resolveMapPitchDegrees(mapPitchEnabled, lowPowerMode);
  const pitchGesturesEnabled = interactive && maxPitchDegrees > 0;

  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
    onUserViewportFramedRef.current = onUserViewportFramed;
  }, [onBoundsChange, onUserViewportFramed]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) {
      return;
    }
    map.setMaxPitch(maxPitchDegrees);
    if (maxPitchDegrees === 0 && map.getPitch() !== 0) {
      map.easeTo({ pitch: 0, duration: 0 });
    }
  }, [maxPitchDegrees]);

  const emitBounds = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) {
      return;
    }
    const nextBounds = mapBoundsFromMapLibre(map);
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
            ? `h-full w-full maplibregl-map ${containerSurfaceClass}${satelliteGradeClass}`
            : `h-full w-full maplibregl-map pointer-events-auto ${containerSurfaceClass}${satelliteGradeClass}`
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
          maxPitch={maxPitchDegrees}
          dragPan={interactive}
          boxZoom={interactive}
          keyboard={interactive}
          scrollZoom={interactive}
          doubleClickZoom={interactive}
          dragRotate={false}
          touchPitch={pitchGesturesEnabled}
          touchZoomRotate={interactive}
          pitchWithRotate={pitchGesturesEnabled}
          onLoad={() => {
            const map = mapRef.current?.getMap();
            // Re-assert after react-map-gl handler sync: pinch zoom on, rotate off.
            if (interactive) {
              map?.touchZoomRotate.enable();
              map?.touchZoomRotate.disableRotation();
            }
            map?.setMaxPitch(maxPitchDegrees);
            if (maxPitchDegrees === 0) {
              map?.easeTo({ pitch: 0, duration: 0 });
            }
            emitBounds();
          }}
          onMoveEnd={handleMoveEnd}
          onDragEnd={handleDragEnd}
          onZoomEnd={handleZoomEnd}
          onClick={handleClick}
        >
          <MapFocus
              focusBounds={focusBounds ?? null}
              focusMinZoom={focusMinZoom}
              focusMaxZoom={focusMaxZoom}
              fitBoundsMode={fitBoundsMode}
              recenterToken={recenterToken}
              suppressChromeHideRef={suppressChromeHideRef}
              fitBoundsPadding={fitBoundsPadding}
              focusPaddingBias={focusPaddingBias}
              preferFly={focusPreferFly}
            />
            {chromeHudRef ? (
              <MapChromeListener
                chromeHudRef={chromeHudRef}
                suppressRef={suppressChromeHideRef}
              />
            ) : null}
            <MapRecenterControl
              enabled={showRecenterControl ?? false}
              inset={zoomControlInset}
              suppressRef={suppressChromeHideRef}
              onRecenter={onRecenter}
            />
            <MapZoomControl
              enabled={zoomControlEnabled}
              inset={zoomControlInset}
              suppressRef={suppressChromeHideRef}
            />
            <AttributionControl compact position="bottom-left" />
            {onMapStyleChange ? (
              <MapStyleToggle
                enabled={mapStyleToggleEnabled}
                mapStyle={mapStyle}
                streetBasemap={streetBasemap}
                onMapStyleChange={onMapStyleChange}
                inset={styleControlInset}
                suppressRef={suppressChromeHideRef}
              />
            ) : null}
            {children}
        </Map>
      </div>
    </div>
  );
}
