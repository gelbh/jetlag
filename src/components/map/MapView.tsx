import { useEffect, useRef, type RefObject } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type {
  LatLng,
  LatLngBoundsExpression,
  LatLngExpression,
  LeafletEvent,
  Map as LeafletMap,
  Point,
} from "leaflet";
import { LatLngBounds, latLngBounds, point } from "leaflet";
import { getMapBasemap, type MapStyle } from "../../domain/map/mapBasemaps";
import { isUsableMapBounds } from "../../domain/geometry/geometry";
import {
  MAP_CAMERA_LARGE_JUMP_CENTER_FRACTION,
  MAP_CAMERA_LARGE_JUMP_ZOOM_DELTA,
  MOTION_MAP_CAMERA_FLY_S,
  MOTION_MAP_CAMERA_S,
} from "../../domain/device/motionTokens";
import { useMotionProfile } from "../../hooks/useMotionProfile";
import { MapChromeListener } from "./MapChromeListener";
import { MapStyleToggle } from "./MapStyleToggle";
import { MapRecenterControl } from "./MapRecenterControl";
import { MapZoomControl, type MapZoomControlInset } from "./MapZoomControl";

interface MapViewProps {
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
  mapStyle?: MapStyle;
  onBoundsChange?: (bounds: LatLngBounds) => void;
  /** Fired when the user pans or zooms the map (not programmatic fit/resize). */
  onUserViewportFramed?: () => void;
  onMapClick?: (lat: number, lng: number) => void;
  chromeHudRef?: RefObject<HTMLElement | null>;
  suppressChromeHideRef?: RefObject<boolean>;
  interactive?: boolean;
  focusBounds?: LatLngBoundsExpression | null;
  focusMinZoom?: number;
  focusMaxZoom?: number;
  /** When "once", fitBounds runs on mount and on recenterToken changes only. */
  fitBoundsMode?: "once" | "always";
  /** Leaflet fitBounds padding in pixels. */
  fitBoundsPadding?: [number, number];
  /** Extra bottom padding (px) when framing placement overlays. */
  focusPaddingBias?: number;
  /** Force the cinematic `flyTo` path on the next reframe even if the geometry
   * delta looks small (e.g. a placement phase transition). */
  focusPreferFly?: boolean;
  /** Increment to programmatically refit focusBounds (e.g. Recenter button). */
  recenterToken?: number;
  showZoomControl?: boolean;
  zoomControlInset?: MapZoomControlInset;
  onMapStyleChange?: (style: MapStyle) => void;
  showMapStyleToggle?: boolean;
  mapStyleControlInset?: MapZoomControlInset;
  showRecenterControl?: boolean;
  onRecenter?: () => void;
  children?: React.ReactNode;
  mapKey?: string;
}

function normalizeFocusBounds(bounds: LatLngBoundsExpression): LatLngBounds {
  return bounds instanceof LatLngBounds ? bounds : latLngBounds(bounds);
}

/**
 * Mirrors Leaflet's private `Map._getBoundsCenterZoom` using only public APIs.
 * Needed so we can clamp zoom to a placement-specific min/max *before* deriving
 * the center — asymmetric padding shifts the center, not just the zoom, so
 * recomputing at the final clamped zoom keeps geometry framed above the panel
 * instead of the two-step fit-then-clamp jump this replaces.
 */
function computeFramedCenterZoom(
  map: LeafletMap,
  bounds: LatLngBounds,
  paddingTopLeft: Point,
  paddingBottomRight: Point,
  minZoom?: number,
  maxZoom?: number,
): { center: LatLng; zoom: number } {
  let zoom = map.getBoundsZoom(
    bounds,
    false,
    paddingTopLeft.add(paddingBottomRight),
  );
  if (typeof maxZoom === "number") {
    zoom = Math.min(maxZoom, zoom);
  }
  if (typeof minZoom === "number") {
    zoom = Math.max(minZoom, zoom);
  }

  if (zoom === Infinity) {
    return { center: bounds.getCenter(), zoom };
  }

  const paddingOffset = paddingBottomRight.subtract(paddingTopLeft).divideBy(2);
  const swPoint = map.project(bounds.getSouthWest(), zoom);
  const nePoint = map.project(bounds.getNorthEast(), zoom);
  const center = map.unproject(
    swPoint.add(nePoint).divideBy(2).add(paddingOffset),
    zoom,
  );

  return { center, zoom };
}

/** Large reframes (phase changes, answers, Recenter) read better as a cinematic
 * `flyTo`; small edits stay a short `setView` so walk/POI updates don't lag. */
function isLargeCameraJump(
  map: LeafletMap,
  targetCenter: LatLng,
  targetZoom: number,
  preferFly: boolean,
): boolean {
  if (preferFly) {
    return true;
  }

  if (Math.abs(targetZoom - map.getZoom()) >= MAP_CAMERA_LARGE_JUMP_ZOOM_DELTA) {
    return true;
  }

  const size = map.getSize();
  const viewportSpanPx = Math.max(size.x, size.y);
  if (viewportSpanPx <= 0) {
    return false;
  }

  const centerDeltaPx = map
    .latLngToContainerPoint(map.getCenter())
    .distanceTo(map.latLngToContainerPoint(targetCenter));

  return centerDeltaPx / viewportSpanPx >= MAP_CAMERA_LARGE_JUMP_CENTER_FRACTION;
}

function MapFocus({
  focusBounds,
  focusMinZoom,
  focusMaxZoom,
  fitBoundsMode,
  recenterToken = 0,
  suppressChromeHideRef,
  fitBoundsPadding = [32, 32],
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

    if (suppressChromeHideRef) {
      suppressChromeHideRef.current = true;
    }

    map.invalidateSize();

    const [padY, padX] = fitBoundsPadding;
    const paddingTopLeft = point(padX, padY);
    const paddingBottomRight =
      focusPaddingBias !== undefined
        ? point(padX, padY + focusPaddingBias)
        : point(padX, padY);

    const bounds = normalizeFocusBounds(focusBounds);
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
      return;
    }

    if (isLargeCameraJump(map, center, zoom, preferFly)) {
      map.flyTo(center, zoom, { duration: MOTION_MAP_CAMERA_FLY_S });
    } else {
      map.setView(center, zoom, { animate: true, duration: MOTION_MAP_CAMERA_S });
    }
  }, [
    animate,
    focusBounds,
    focusMaxZoom,
    focusMinZoom,
    fitBoundsMode,
    fitBoundsPadding,
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

export function MapView({
  center = [51.505, -0.09],
  zoom = 13,
  className,
  mapStyle = "standard",
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
  const basemap = getMapBasemap(mapStyle);
  const zoomControlEnabled = showZoomControl ?? interactive;
  const mapStyleToggleEnabled =
    (showMapStyleToggle ?? Boolean(onMapStyleChange)) &&
    Boolean(onMapStyleChange);
  const styleControlInset = mapStyleControlInset ?? zoomControlInset;

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
          interactive ? "h-full w-full" : "h-full w-full pointer-events-auto"
        }
      >
        <TileLayer
          key={basemap.id}
          attribution=""
          url={basemap.url}
          maxZoom={basemap.maxZoom}
          {...(basemap.subdomains ? { subdomains: basemap.subdomains } : {})}
        />
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
