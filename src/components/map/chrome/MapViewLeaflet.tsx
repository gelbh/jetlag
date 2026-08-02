import { useEffect, useRef, type RefObject } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type {
  LatLngBoundsExpression,
  LeafletEvent,
} from "leaflet";
import { LatLngBounds, latLngBounds, point } from "leaflet";
import { computeFramedCenterZoom } from "../../../domain/map/computeFramedCenterZoom";
import { isLargeCameraJump } from "../../../domain/map/isLargeCameraJump";
import {
  getBasemapSurface,
  getMapBasemap,
} from "../../../domain/map/mapBasemaps";
import { isUsableMapBounds } from "../../../domain/geometry/gameArea/geometry";
import {
  MOTION_MAP_CAMERA_FLY_S,
  MOTION_MAP_CAMERA_S,
} from "../../../domain/device/motion/motionTokens";
import { useMotionProfile } from "../../../hooks/motion/useMotionProfile";
import { MapChromeListener } from "./MapChromeListener";
import { MapStyleToggle } from "./MapStyleToggle";
import { MapRecenterControl } from "./MapRecenterControl";
import { MapZoomControl } from "./MapZoomControl";
import type { MapViewProps } from "./mapViewTypes";

function normalizeFocusBounds(bounds: LatLngBoundsExpression): LatLngBounds {
  return bounds instanceof LatLngBounds ? bounds : latLngBounds(bounds);
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
  focusBounds: LatLngBoundsExpression | null;
  focusMinZoom?: number;
  focusMaxZoom?: number;
  fitBoundsMode: "once" | "always";
  recenterToken: number;
  suppressChromeHideRef?: RefObject<boolean>;
  fitBoundsPadding?: [number, number];
  focusPaddingBias?: number;
  /** Force the cinematic `flyTo` path even when the geometry delta is modest
   * (e.g. a phase transition where the new target happens to sit nearby). */
  preferFly?: boolean;
}) {
  const map = useMap();
  const { prefersReducedMotion, lowPowerMode } = useMotionProfile();
  const hasFittedRef = useRef(false);
  const lastRecenterRef = useRef(recenterToken);
  const animate = !prefersReducedMotion && !lowPowerMode;
  const padY = fitBoundsPaddingProp?.[0] ?? 32;
  const padX = fitBoundsPaddingProp?.[1] ?? 32;

  useEffect(() => {
    const handleDragStart = () => {
      map.stop();
      if (suppressChromeHideRef) {
        suppressChromeHideRef.current = false;
      }
    };

    map.on("dragstart", handleDragStart);
    return () => {
      map.off("dragstart", handleDragStart);
    };
  }, [map, suppressChromeHideRef]);

  useEffect(() => {
    if (!focusBounds) {
      return;
    }

    const recenterRequested = recenterToken !== lastRecenterRef.current;
    if (
      fitBoundsMode === "once" &&
      hasFittedRef.current &&
      !recenterRequested
    ) {
      return;
    }

    lastRecenterRef.current = recenterToken;

    map.invalidateSize();

    const paddingTopLeft = point(padX, padY);
    const paddingBottomRight =
      focusPaddingBias !== undefined
        ? point(padX, padY + focusPaddingBias)
        : point(padX, padY);

    const bounds = normalizeFocusBounds(focusBounds);
    if (!isUsableMapBounds(bounds)) {
      return;
    }

    if (suppressChromeHideRef) {
      suppressChromeHideRef.current = true;
    }

    const { center, zoom } = computeFramedCenterZoom(
      map,
      bounds,
      paddingTopLeft,
      paddingBottomRight,
      focusMinZoom,
      focusMaxZoom,
    );

    hasFittedRef.current = true;

    const onMoveEnd = () => {
      if (suppressChromeHideRef) {
        suppressChromeHideRef.current = false;
      }
      map.off("moveend", onMoveEnd);
    };

    map.on("moveend", onMoveEnd);

    if (!animate) {
      map.setView(center, zoom, { animate: false });
      return () => {
        map.off("moveend", onMoveEnd);
        if (suppressChromeHideRef) {
          suppressChromeHideRef.current = false;
        }
      };
    }

    if (isLargeCameraJump(map, center, zoom, preferFly)) {
      map.flyTo(center, zoom, { duration: MOTION_MAP_CAMERA_FLY_S });
    } else {
      map.setView(center, zoom, { animate: true, duration: MOTION_MAP_CAMERA_S });
    }

    return () => {
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
    map,
    preferFly,
    recenterToken,
    suppressChromeHideRef,
  ]);

  return null;
}

function MapResize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const target = container.parentElement;
    let timeoutId = 0;

    const resize = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        map.invalidateSize();
      }, 100);
    };

    resize();
    window.addEventListener("resize", resize);

    const observer = target ? new ResizeObserver(resize) : null;
    if (target && observer) {
      observer.observe(target);
    }

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", resize);
      observer?.disconnect();
    };
  }, [map]);

  return null;
}

function MapEvents({
  onBoundsChange,
  onUserViewportFramed,
  onMapClick,
}: {
  onBoundsChange?: (bounds: LatLngBounds) => void;
  onUserViewportFramed?: () => void;
  onMapClick?: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onUserViewportFramedRef = useRef(onUserViewportFramed);

  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
    onUserViewportFramedRef.current = onUserViewportFramed;
  }, [onBoundsChange, onUserViewportFramed]);

  useEffect(() => {
    const emitBounds = () => {
      const nextBounds = map.getBounds();
      if (!isUsableMapBounds(nextBounds)) {
        return;
      }

      onBoundsChangeRef.current?.(nextBounds);
    };

    let userZoom = false;

    const handleUserViewportFramed = () => {
      onUserViewportFramedRef.current?.();
    };

    const handleZoomStart = (event: LeafletEvent) => {
      if ("originalEvent" in event && event.originalEvent) {
        userZoom = true;
      }
    };

    const handleZoomEnd = () => {
      if (userZoom) {
        userZoom = false;
        handleUserViewportFramed();
      }
    };

    emitBounds();
    map.on("moveend", emitBounds);
    map.on("zoomend", emitBounds);
    map.on("dragend", handleUserViewportFramed);
    map.on("zoomstart", handleZoomStart);
    map.on("zoomend", handleZoomEnd);

    return () => {
      map.off("moveend", emitBounds);
      map.off("zoomend", emitBounds);
      map.off("dragend", handleUserViewportFramed);
      map.off("zoomstart", handleZoomStart);
      map.off("zoomend", handleZoomEnd);
    };
  }, [map]);

  useMapEvents({
    click(event) {
      onMapClick?.(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

export function MapViewLeaflet({
  center = [51.505, -0.09],
  zoom = 13,
  className,
  mapStyle = "standard",
  streetBasemap = "light",
  onBoundsChange,
  onUserViewportFramed,
  onMapClick,
  chromeHudRef,
  suppressChromeHideRef,
  interactive = true,
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
  children,
  mapKey,
}: MapViewProps) {
  const basemap = getMapBasemap(mapStyle, streetBasemap);
  const surface = getBasemapSurface(mapStyle, streetBasemap);
  const zoomControlEnabled = showZoomControl ?? interactive;
  const mapStyleToggleEnabled =
    (showMapStyleToggle ?? Boolean(onMapStyleChange)) &&
    Boolean(onMapStyleChange);
  const styleControlInset = mapStyleControlInset ?? zoomControlInset;
  const containerSurfaceClass =
    surface === "light" ? "jl-basemap--light" : "jl-basemap--dark-canvas";
  const satelliteGradeClass =
    mapStyle === "satellite" ? " jl-basemap--satellite-grade" : "";

  return (
    <div className={className ?? "h-full w-full"}>
      <MapContainer
        key={mapKey}
        center={center}
        zoom={zoom}
        attributionControl={false}
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        zoomControl={false}
        className={
          interactive
            ? `h-full w-full ${containerSurfaceClass}${satelliteGradeClass}`
            : `h-full w-full pointer-events-auto ${containerSurfaceClass}${satelliteGradeClass}`
        }
      >
        <TileLayer
          key={basemap.id}
          attribution=""
          url={basemap.url}
          maxZoom={basemap.maxZoom}
          {...(basemap.subdomains ? { subdomains: basemap.subdomains } : {})}
        />
        {(basemap.overlays ?? []).map((overlay) => (
          <TileLayer
            key={overlay.id}
            attribution=""
            url={overlay.url}
            maxZoom={overlay.maxZoom}
            {...(overlay.subdomains ? { subdomains: overlay.subdomains } : {})}
          />
        ))}
        <MapEvents
          onBoundsChange={onBoundsChange}
          onUserViewportFramed={onUserViewportFramed}
          onMapClick={onMapClick}
        />
        {chromeHudRef ? (
          <MapChromeListener
            chromeHudRef={chromeHudRef}
            suppressRef={suppressChromeHideRef}
          />
        ) : null}
        <MapFocus
          focusBounds={focusBounds}
          focusMinZoom={focusMinZoom}
          focusMaxZoom={focusMaxZoom}
          fitBoundsMode={fitBoundsMode}
          recenterToken={recenterToken}
          suppressChromeHideRef={suppressChromeHideRef}
          fitBoundsPadding={fitBoundsPadding}
          focusPaddingBias={focusPaddingBias}
          preferFly={focusPreferFly}
        />
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
        <MapResize />
        {children}
      </MapContainer>
    </div>
  );
}
