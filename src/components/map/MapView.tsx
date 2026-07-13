import { useEffect, useRef, type CSSProperties, type MutableRefObject } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type {
  LatLngBounds,
  LatLngBoundsExpression,
  LatLngExpression,
  LeafletEvent,
} from "leaflet";
import { getMapBasemap, type MapStyle } from "../../domain/map/mapBasemaps";
import {
  isMapTiltActive,
  mapTiltCssVariables,
  mapTiltFitBoundsPadding,
  MAP_TILT_TILE_KEEP_BUFFER,
  type MapTilt,
} from "../../domain/map/mapTilt";
import { isUsableMapBounds } from "../../domain/geometry/geometry";
import { MOTION_MAP_CAMERA_S } from "../../domain/device/motionTokens";
import { useMotionProfile } from "../../hooks/useMotionProfile";
import { MapChromeListener } from "./MapChromeListener";
import { MapLeftChromeControls } from "./MapLeftChromeControls";
import { MapZoomControl, type MapZoomControlInset } from "./MapZoomControl";

interface MapViewProps {
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
  mapStyle?: MapStyle;
  mapTilt?: MapTilt;
  lowPowerMode?: boolean;
  onBoundsChange?: (bounds: LatLngBounds) => void;
  /** Fired when the user pans or zooms the map (not programmatic fit/resize). */
  onUserViewportFramed?: () => void;
  onMapClick?: (lat: number, lng: number) => void;
  chromeHudRef?: MutableRefObject<HTMLElement | null>;
  suppressChromeHideRef?: MutableRefObject<boolean>;
  interactive?: boolean;
  focusBounds?: LatLngBoundsExpression | null;
  /** When "once", fitBounds runs on mount and on recenterToken changes only. */
  fitBoundsMode?: "once" | "always";
  /** Leaflet fitBounds padding in pixels. */
  fitBoundsPadding?: [number, number];
  /** Extra bottom padding (px) when framing placement overlays. */
  focusPaddingBias?: number;
  /** Increment to programmatically refit focusBounds (e.g. Recenter button). */
  recenterToken?: number;
  showZoomControl?: boolean;
  zoomControlInset?: MapZoomControlInset;
  onMapStyleChange?: (style: MapStyle) => void;
  showMapStyleToggle?: boolean;
  onMapTiltChange?: (tilt: MapTilt) => void;
  showMapTiltToggle?: boolean;
  mapStyleControlInset?: MapZoomControlInset;
  children?: React.ReactNode;
  mapKey?: string;
}

function MapFocus({
  focusBounds,
  fitBoundsMode,
  recenterToken = 0,
  suppressChromeHideRef,
  fitBoundsPadding = [32, 32],
  focusPaddingBias,
  mapTilt = "flat",
}: {
  focusBounds: LatLngBoundsExpression | null;
  fitBoundsMode: "once" | "always";
  recenterToken: number;
  suppressChromeHideRef?: MutableRefObject<boolean>;
  fitBoundsPadding?: [number, number];
  focusPaddingBias?: number;
  mapTilt?: MapTilt;
}) {
  const map = useMap();
  const { prefersReducedMotion, lowPowerMode } = useMotionProfile();
  const hasFittedRef = useRef(false);
  const lastRecenterRef = useRef(recenterToken);
  const lastMapTiltRef = useRef(mapTilt);
  const animate = !prefersReducedMotion && !lowPowerMode;

  useEffect(() => {
    if (!focusBounds) {
      return;
    }

    const recenterRequested = recenterToken !== lastRecenterRef.current;
    const tiltChanged = mapTilt !== lastMapTiltRef.current;
    lastMapTiltRef.current = mapTilt;

    if (
      fitBoundsMode === "once" &&
      hasFittedRef.current &&
      !recenterRequested &&
      !tiltChanged
    ) {
      return;
    }

    lastRecenterRef.current = recenterToken;

    if (suppressChromeHideRef) {
      suppressChromeHideRef.current = true;
    }

    map.invalidateSize();

    const resolvedPadding = mapTiltFitBoundsPadding(fitBoundsPadding, mapTilt);
    const [padY, padX] = resolvedPadding;
    const fitOptions =
      focusPaddingBias !== undefined
        ? {
            animate,
            duration: MOTION_MAP_CAMERA_S,
            paddingTopLeft: [padY, padX] as [number, number],
            paddingBottomRight: [padY, padX + focusPaddingBias] as [
              number,
              number,
            ],
          }
        : { padding: resolvedPadding };

    map.fitBounds(focusBounds, fitOptions);
    hasFittedRef.current = true;

    const onMoveEnd = () => {
      if (suppressChromeHideRef) {
        suppressChromeHideRef.current = false;
      }
      map.off("moveend", onMoveEnd);
    };

    map.on("moveend", onMoveEnd);
  }, [
    animate,
    focusBounds,
    fitBoundsMode,
    fitBoundsPadding,
    focusPaddingBias,
    map,
    mapTilt,
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
  mapTilt = "flat",
  lowPowerMode = false,
  onBoundsChange,
  onUserViewportFramed,
  onMapClick,
  chromeHudRef,
  suppressChromeHideRef,
  interactive = true,
  focusBounds = null,
  fitBoundsMode = "always",
  fitBoundsPadding,
  focusPaddingBias,
  recenterToken = 0,
  showZoomControl,
  zoomControlInset = "dock",
  onMapStyleChange,
  showMapStyleToggle,
  onMapTiltChange,
  showMapTiltToggle,
  mapStyleControlInset,
  children,
  mapKey,
}: MapViewProps) {
  const basemap = getMapBasemap(mapStyle);
  const tiltActive = isMapTiltActive(mapTilt);
  const zoomControlEnabled = showZoomControl ?? interactive;
  const mapStyleToggleEnabled =
    (showMapStyleToggle ?? Boolean(onMapStyleChange)) &&
    Boolean(onMapStyleChange);
  const mapTiltToggleEnabled =
    (showMapTiltToggle ?? Boolean(onMapTiltChange)) && Boolean(onMapTiltChange);
  const styleControlInset = mapStyleControlInset ?? zoomControlInset;
  const tiltShellStyle = tiltActive
    ? (mapTiltCssVariables() as CSSProperties)
    : undefined;

  return (
    <div
      className={className ?? "h-full w-full"}
      {...(tiltActive ? { "data-map-tilt": "tilted" as const } : {})}
      style={tiltShellStyle}
    >
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
          {...(tiltActive ? { keepBuffer: MAP_TILT_TILE_KEEP_BUFFER } : {})}
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
          fitBoundsMode={fitBoundsMode}
          recenterToken={recenterToken}
          suppressChromeHideRef={suppressChromeHideRef}
          fitBoundsPadding={fitBoundsPadding}
          focusPaddingBias={focusPaddingBias}
          mapTilt={mapTilt}
        />
        <MapZoomControl
          enabled={zoomControlEnabled}
          inset={zoomControlInset}
          suppressRef={suppressChromeHideRef}
        />
        {onMapStyleChange || onMapTiltChange ? (
          <MapLeftChromeControls
            styleToggleEnabled={mapStyleToggleEnabled}
            mapStyle={mapStyle}
            onMapStyleChange={onMapStyleChange}
            tiltToggleEnabled={mapTiltToggleEnabled && !lowPowerMode}
            mapTilt={mapTilt}
            onMapTiltChange={onMapTiltChange}
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
