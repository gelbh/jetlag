import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  AttributionControl,
  type MapRef,
} from "react-map-gl/maplibre";
import { setWorkerUrl, type Map as MapLibreMap } from "maplibre-gl";
import {
  createMapBounds,
  toMapBounds,
  type MapBoundsExpression,
  type MapLatLng,
} from "@/domain/map/mapBounds";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/styles/map-touch-gestures.css";
import mapLibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import {
  getBasemapSurface,
  getMapLibreStyle,
} from "@/domain/map/mapBasemaps";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_LNGLAT,
} from "@/domain/map/defaultMapCenter";
import { isUsableMapBounds } from "@/domain/geometry/gameArea/geometry";
import { computeFramedCenterZoomMapLibre } from "@/domain/map/computeFramedCenterZoomMapLibre";
import { focusBoundsToLngLatBounds } from "@/domain/map/focusBoundsToLngLatBounds";
import { isLargeCameraJumpMapLibre } from "@/domain/map/isLargeCameraJumpMapLibre";
import { shouldApplyMapFocus } from "@/domain/map/mapFocusPolicy";
import { mapFocusApplyDependencyKeys } from "@/domain/map/mapFocusApplyDeps";
import { MAP_CAMERA_HOME_ORIENTATION } from "@/domain/map/mapCameraHome";
import { resolveMapPitchDegrees } from "@/domain/map/resolveMapPitchDegrees";
import { stopMapCameraEase } from "@/domain/map/stopMapCameraEase";
import {
  MOTION_MAP_CAMERA_FLY_MS,
  MOTION_MAP_CAMERA_MS,
} from "@/domain/device/motion/motionTokens";
import { mapLibreRuntimeOptions } from "@/domain/device/perf/mapLibreRuntimeOptions";
import { useMotionProfile } from "@/hooks/motion/useMotionProfile";
import { useMapLibreMap } from "../helpers/useMapLibreMap";
import {
  MapFeatureHitTestBridge,
  MapFeatureHitTestProvider,
} from "../helpers/MapFeatureHitTestContext";
import { useMapLibreMarkerImages } from "../helpers/mapLibreIconRegistry";
import { MapChromeListener } from "./MapChromeListener";
import { MapCompassControl } from "./MapCompassControl";
import { MapStyleToggle } from "./MapStyleToggle";
import { MapZoomControl } from "./MapZoomControl";
import type { MapViewMapLibreProps } from "./mapViewTypes";

setWorkerUrl(mapLibreWorkerUrl);

function centerToLngLat(center: MapLatLng | undefined): [number, number] {
  if (center == null) {
    return DEFAULT_MAP_LNGLAT;
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
  return DEFAULT_MAP_LNGLAT;
}

function MapLibreMarkerImagesLoader() {
  useMapLibreMarkerImages();
  return null;
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
  orientationResetToken = 0,
  fitBoundsPadding: fitBoundsPaddingProp,
  focusPaddingBias,
  preferFly = false,
}: {
  focusBounds: MapBoundsExpression | null;
  focusMinZoom?: number;
  focusMaxZoom?: number;
  fitBoundsMode: "once" | "always";
  recenterToken: number;
  /** Compass-only — never share with placement auto-reframe tokens. */
  orientationResetToken?: number;
  fitBoundsPadding?: [number, number];
  focusPaddingBias?: number;
  preferFly?: boolean;
}) {
  const mapRef = useMapLibreMap();
  const { prefersReducedMotion, lowPowerMode } = useMotionProfile();
  const hasFittedRef = useRef(false);
  const lastRecenterRef = useRef(recenterToken);
  const lastOrientationRef = useRef(orientationResetToken);
  const preferFlyRef = useRef(preferFly);
  const focusBoundsRef = useRef(focusBounds);
  const focusPaddingBiasRef = useRef(focusPaddingBias);
  const focusMinZoomRef = useRef(focusMinZoom);
  const focusMaxZoomRef = useRef(focusMaxZoom);
  const animate = !prefersReducedMotion && !lowPowerMode;
  const padY = fitBoundsPaddingProp?.[0] ?? 32;
  const padX = fitBoundsPaddingProp?.[1] ?? 32;
  const applyDependencyKeys = mapFocusApplyDependencyKeys({
    fitBoundsMode,
    animate,
    focusBounds,
    focusPaddingBias,
    focusMaxZoom,
    focusMinZoom,
    padX,
    padY,
    recenterToken,
  });

  useEffect(() => {
    preferFlyRef.current = preferFly;
    focusBoundsRef.current = focusBounds;
    focusPaddingBiasRef.current = focusPaddingBias;
    focusMinZoomRef.current = focusMinZoom;
    focusMaxZoomRef.current = focusMaxZoom;
  }, [
    preferFly,
    focusBounds,
    focusPaddingBias,
    focusMinZoom,
    focusMaxZoom,
  ]);

  useEffect(() => {
    const map = mapRef.getMap();
    const handleDragStart = () => {
      // Interrupt flyTo/easeTo only — never map.stop() (resets TouchPan/TouchZoom).
      stopMapCameraEase(map);
    };

    map.on("dragstart", handleDragStart);
    return () => {
      map.off("dragstart", handleDragStart);
    };
  }, [mapRef]);

  // once-mode omits live bounds/zoom/bias from deps (refs) so identity churn
  // cannot abort an in-flight ease via effect cleanup — intentional.
  useEffect(() => {
    // Apply-time values always from refs (synced above). Deps differ by mode:
    // once → presence/token only; always → live bounds/bias/zoom.
    const map = mapRef.getMap();
    const orientationRequested =
      orientationResetToken !== lastOrientationRef.current;
    const homeOrientation = orientationRequested
      ? MAP_CAMERA_HOME_ORIENTATION
      : null;

    const levelOrientationOnly = () => {
      lastOrientationRef.current = orientationResetToken;
      if (!homeOrientation) {
        return undefined;
      }
      if (!animate) {
        map.jumpTo({ ...homeOrientation });
        return undefined;
      }
      map.easeTo({
        ...homeOrientation,
        duration: MOTION_MAP_CAMERA_MS,
      });
      return () => {
        stopMapCameraEase(map);
      };
    };

    const bounds = focusBoundsRef.current;
    if (!bounds) {
      // Compass reset must level even when focus bounds are unavailable.
      return orientationRequested ? levelOrientationOnly() : undefined;
    }

    const willApply = shouldApplyMapFocus({
      fitBoundsMode,
      hasFitted: hasFittedRef.current,
      recenterToken,
      lastRecenterToken: lastRecenterRef.current,
    });
    if (!willApply) {
      // Placement auto-reframe skipped, but compass may still need leveling.
      return orientationRequested ? levelOrientationOnly() : undefined;
    }

    map.resize();

    const paddingBias = focusPaddingBiasRef.current ?? 0;
    const minZoom = focusMinZoomRef.current;
    const maxZoom = focusMaxZoomRef.current;

    const padding = {
      top: padY,
      left: padX,
      right: padX,
      bottom: padY + paddingBias,
    };

    const mapBounds = toMapBounds(bounds);
    if (!isUsableMapBounds(mapBounds)) {
      return orientationRequested ? levelOrientationOnly() : undefined;
    }

    const lngLatBounds = focusBoundsToLngLatBounds(mapBounds);
    const framed = computeFramedCenterZoomMapLibre(
      map,
      lngLatBounds,
      padding,
      minZoom,
      maxZoom,
    );
    if (!framed) {
      return orientationRequested ? levelOrientationOnly() : undefined;
    }

    lastRecenterRef.current = recenterToken;
    lastOrientationRef.current = orientationResetToken;
    hasFittedRef.current = true;

    const onMoveEnd = () => {
      map.off("moveend", onMoveEnd);
    };

    map.on("moveend", onMoveEnd);

    const { center, zoom } = framed;

    if (!animate) {
      map.jumpTo(
        homeOrientation
          ? { center, zoom, ...homeOrientation }
          : { center, zoom },
      );
      return () => {
        // Same as dragstart: cancel ease only — map.stop() resets active pinch/pan.
        // Survival across preferFly/bounds-identity churn comes from once-mode deps
        // (refs + presence), not from skipping this cleanup.
        stopMapCameraEase(map);
        map.off("moveend", onMoveEnd);
      };
    }

    if (
      isLargeCameraJumpMapLibre(map, center, zoom, preferFlyRef.current)
    ) {
      map.flyTo({
        center,
        zoom,
        ...(homeOrientation ?? {}),
        duration: MOTION_MAP_CAMERA_FLY_MS,
      });
    } else {
      map.easeTo({
        center,
        zoom,
        ...(homeOrientation ?? {}),
        duration: MOTION_MAP_CAMERA_MS,
      });
    }

    return () => {
      stopMapCameraEase(map);
      map.off("moveend", onMoveEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keys from mapFocusApplyDependencyKeys
  }, [...applyDependencyKeys, mapRef, orientationResetToken]);

  return null;
}

/**
 * MapLibre shell: basemap + chrome + click/bounds + camera/focus parity.
 */
export function MapViewMapLibre({
  center = DEFAULT_MAP_CENTER,
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
  showCompassControl,
  onRecenter,
}: MapViewMapLibreProps) {
  const mapRef = useRef<MapRef>(null);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onUserViewportFramedRef = useRef(onUserViewportFramed);
  const onRecenterRef = useRef(onRecenter);
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
  // Opt-in only — admin/observer/create-session must not inherit play-map compass.
  const compassControlEnabled = showCompassControl ?? false;
  const [fallbackRecenterToken, setFallbackRecenterToken] = useState(0);
  const [orientationResetToken, setOrientationResetToken] = useState(0);
  const focusRecenterToken = onRecenter
    ? recenterToken
    : fallbackRecenterToken;
  const handleCompassReset = useCallback(() => {
    // Orientation signal is compass-only; pan/zoom home uses recenter token.
    setOrientationResetToken((value) => value + 1);
    if (onRecenterRef.current) {
      onRecenterRef.current();
      return;
    }
    setFallbackRecenterToken((value) => value + 1);
  }, []);
  const mapStyleToggleEnabled =
    (showMapStyleToggle ?? Boolean(onMapStyleChange)) &&
    Boolean(onMapStyleChange);
  const styleControlInset = mapStyleControlInset ?? zoomControlInset;
  const { lowPowerMode } = useMotionProfile();
  const maxPitchDegrees = resolveMapPitchDegrees(lowPowerMode);
  const pitchGesturesEnabled = interactive && maxPitchDegrees > 0;
  const touchRotateEnabled = interactive && compassControlEnabled;
  const runtimeOptions = mapLibreRuntimeOptions(lowPowerMode);

  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
    onUserViewportFramedRef.current = onUserViewportFramed;
    onRecenterRef.current = onRecenter;
  }, [onBoundsChange, onUserViewportFramed, onRecenter]);

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

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !interactive) {
      return;
    }
    map.touchZoomRotate.enable();
    if (touchRotateEnabled) {
      map.touchZoomRotate.enableRotation();
    } else {
      map.touchZoomRotate.disableRotation();
    }
  }, [interactive, touchRotateEnabled]);

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
          fadeDuration={runtimeOptions.fadeDuration}
          maxTileCacheSize={runtimeOptions.maxTileCacheSize}
          // Slice D eval (hardening): reuseMaps skipped — style toggles already
          // call setStyle in-place (not remount); session remounts via mapKey are
          // rare; reuseMaps risks stale GL/image state without a measured win.
          // cooperativeGestures skipped — play maps are full-viewport; create-
          // session framing uses a touch-none fixed-height shell; no scrollable
          // embed that needs ctrl+scroll to protect page scroll.
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
          pitchWithRotate={pitchGesturesEnabled && touchRotateEnabled}
          onLoad={() => {
            const map = mapRef.current?.getMap();
            // Pinch zoom always; two-finger rotate only with play-map compass.
            if (interactive) {
              map?.touchZoomRotate.enable();
              if (touchRotateEnabled) {
                map?.touchZoomRotate.enableRotation();
              } else {
                map?.touchZoomRotate.disableRotation();
              }
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
        >
          <MapFeatureHitTestProvider>
            <MapLibreMarkerImagesLoader />
            <MapFeatureHitTestBridge onMapClick={onMapClick} />
            <MapFocus
              focusBounds={focusBounds ?? null}
              focusMinZoom={focusMinZoom}
              focusMaxZoom={focusMaxZoom}
              fitBoundsMode={fitBoundsMode}
              recenterToken={focusRecenterToken}
              orientationResetToken={orientationResetToken}
              fitBoundsPadding={fitBoundsPadding}
              focusPaddingBias={focusPaddingBias}
              preferFly={focusPreferFly}
            />
            {chromeHudRef ? (
              <MapChromeListener chromeHudRef={chromeHudRef} />
            ) : null}
            <MapCompassControl
              enabled={compassControlEnabled}
              inset={zoomControlInset}
              onResetCamera={handleCompassReset}
            />
            <MapZoomControl
              enabled={zoomControlEnabled}
              inset={zoomControlInset}
            />
            <AttributionControl compact position="bottom-left" />
            {onMapStyleChange ? (
              <MapStyleToggle
                enabled={mapStyleToggleEnabled}
                mapStyle={mapStyle}
                streetBasemap={streetBasemap}
                onMapStyleChange={onMapStyleChange}
                inset={styleControlInset}
              />
            ) : null}
            {children}
          </MapFeatureHitTestProvider>
        </Map>
      </div>
    </div>
  );
}
